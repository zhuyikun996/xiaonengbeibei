// pages/quiz/index.js
const wordsetRegistry = require('../../data/wordsets/index');
const phonetics = require('../../data/phonetics');
const mastery = require('../../utils/mastery');

const ROUND_SIZE = 10;

Page({
  data: {
    wordSetTitle: '',
    currentWord: null,
    mode: 'study',
    showExamples: true,
    showExercise: false,
    selectedAnswer: '',
    exerciseRevealed: false,
    currentExercise: null,
    choiceOptions: [],
    answered: false,
    isCorrect: false,
    feedbackText: '',
    nextButtonText: '下一个',
    currentExerciseAnswerDisplay: '',
    fillInput: '',
    showPoster: false,
    streakDaysForPoster: 0,

    // 本轮相关
    roundPhase: 'study',
    roundWords: [],
    roundIndex: 0,
    roundTotal: 0,
    roundWrongPool: [],
    roundCorrectCount: 0,
    roundWrongCount: 0,
    roundStreakMax: 0,
    roundStreakCurrent: 0,
    roundWrongWords: [],
  },

  onLoad() {
    const setId = wx.getStorageSync('currentWordSetId');
    if (!setId) {
      wx.reLaunch({ url: '/pages/home/index' });
      return;
    }
    this._setId = setId;
    this._initTodayLog(setId);
    this.loadWordSet(setId);
  },

  onShow() {
    this._wordTimerStart = Date.now();
  },

  onHide() {
    this._pauseTimer();
  },

  _getToday() {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  _initTodayLog(setId) {
    const today = mastery.getToday();
    const logs = wx.getStorageSync('study_log') || {};
    if (!logs[today] || !logs[today].wordIndices) {
      logs[today] = { setId, wordIndices: [], duration: 0 };
      wx.setStorageSync('study_log', logs);
    }
    mastery.initTodayDailyLog(setId);
  },

  _pauseTimer() {
    if (!this._wordTimerStart) return;
    const elapsed = Math.round((Date.now() - this._wordTimerStart) / 1000);
    if (elapsed <= 0) return;

    const today = this._getToday();
    const logs = wx.getStorageSync('study_log') || {};
    if (logs[today]) {
      logs[today].duration = (logs[today].duration || 0) + elapsed;
      wx.setStorageSync('study_log', logs);
    }
    mastery.addDailyDuration(elapsed);
    this._wordTimerStart = null;
  },

  _addWordToLog(wordIndex) {
    const today = this._getToday();
    const logs = wx.getStorageSync('study_log') || {};
    const todayLog = logs[today];
    if (!todayLog) return;

    if (!todayLog.wordIndices.includes(wordIndex)) {
      todayLog.wordIndices.push(wordIndex);
    }
    wx.setStorageSync('study_log', logs);
    mastery.addDailyWordIndex(wordIndex);
  },

  loadWordSet(setId) {
    const wordSet = wordsetRegistry.getWordSetById(setId);
    if (!wordSet) {
      wx.reLaunch({ url: '/pages/home/index' });
      return;
    }

    const allWords = wordSet.words;
    this._allWords = allWords;
    this._setId = setId;

    const progressKey = `progress_${setId}`;
    const savedIndex = wx.getStorageSync(progressKey) || 0;
    this._savedProgress = savedIndex;

    const start = Math.min(savedIndex, allWords.length);
    const remaining = allWords.length - start;
    const roundTotal = Math.min(ROUND_SIZE, remaining);

    if (roundTotal <= 0) {
      this._startNewRound(0, allWords);
      return;
    }

    this._startNewRound(start, allWords);
  },

  _startNewRound(startIndex, allWords) {
    const roundTotal = Math.min(ROUND_SIZE, allWords.length - startIndex);
    const roundWords = allWords.slice(startIndex, startIndex + roundTotal);

    this._addWordToLog(startIndex);
    this._hasReviewed = false;

    this.setData({
      wordSetTitle: wordsetRegistry.getWordSetById(this._setId).title,
      roundPhase: 'study',
      roundWords,
      roundIndex: 0,
      roundTotal,
      roundWrongPool: [],
      roundCorrectCount: 0,
      roundWrongCount: 0,
      roundStreakMax: 0,
      roundStreakCurrent: 0,
      roundWrongWords: [],
      answered: false,
      isCorrect: false,
      feedbackText: '',
      fillInput: '',
      showExamples: true,
      showExercise: false,
      exerciseRevealed: false,
    });

    this._showRoundWord(0);
  },

  _showRoundWord(index) {
    const { roundWords, mode } = this.data;
    if (index >= roundWords.length) return;

    const currentWord = roundWords[index];
    const exerciseState = this._buildExerciseState(currentWord);
    const hasExercise = currentWord && currentWord.exercises && currentWord.exercises.length > 0;
    const isTestMode = mode === 'test';

    const wordWithPhonetic = currentWord ? {
      ...currentWord,
      phonetic: phonetics[currentWord.word] || '',
    } : null;

    this.setData({
      currentWord: wordWithPhonetic,
      currentExercise: exerciseState.currentExercise,
      currentExerciseAnswerDisplay: exerciseState.currentExerciseAnswerDisplay,
      choiceOptions: exerciseState.choiceOptions,
      roundIndex: index,
      showExamples: !isTestMode,
      showExercise: hasExercise,
      selectedAnswer: '',
      answered: false,
      isCorrect: false,
      feedbackText: '',
      exerciseRevealed: false,
      fillInput: '',
      nextButtonText: isTestMode && exerciseState.currentExercise
        ? '先答题'
        : (hasExercise ? '揭晓答案' : '下一个'),
    });
  },

  prevWord() {
    const { roundIndex, roundPhase } = this.data;
    if (roundPhase === 'done') return;
    if (roundIndex <= 0) return;

    this._pauseTimer();
    this._wordTimerStart = Date.now();

    this._showRoundWord(roundIndex - 1);
    wx.pageScrollTo({ scrollTop: 0, duration: 0 });
  },

  nextWord() {
    const {
      answered,
      currentExercise,
      roundIndex,
      roundTotal,
      exerciseRevealed,
      mode,
      showExercise,
      roundPhase,
    } = this.data;

    if (roundPhase === 'done') return;

    if (mode === 'test' && currentExercise && currentExercise.type === 'choice' && !answered) {
      wx.showToast({ title: '先完成作答', icon: 'none' });
      return;
    }

    if (mode === 'study' && showExercise && !exerciseRevealed) {
      this.setData({
        exerciseRevealed: true,
        nextButtonText: '下一个',
      });
      return;
    }

    if (roundIndex >= roundTotal - 1) {
      this._onRoundFinish();
      return;
    }

    this._pauseTimer();
    this._wordTimerStart = Date.now();

    this._showRoundWord(roundIndex + 1);
    wx.pageScrollTo({ scrollTop: 0, duration: 0 });
  },

  _onRoundFinish() {
    const { mode, roundWrongPool, roundWords } = this.data;

    const startOffset = this._savedProgress;
    const newProgress = startOffset + roundWords.length;
    if (newProgress <= this._allWords.length) {
      wx.setStorageSync(`progress_${this._setId}`, Math.min(newProgress, this._allWords.length - 1));
      this._savedProgress = Math.min(newProgress, this._allWords.length - 1);
    }

    if (mode === 'study') {
      this._startTestRound();
      return;
    }

    if (roundWrongPool.length === 0) {
      this._showSummary();
      return;
    }

    if (this._hasReviewed) {
      this._showSummary();
      return;
    }

    this._hasReviewed = true;
    this._startReviewRound();
  },

  _startTestRound() {
    const roundWords = this.data.roundWords;

    this.setData({
      mode: 'test',
      roundPhase: 'study',
      roundIndex: 0,
      roundWrongPool: [],
      roundCorrectCount: 0,
      roundWrongCount: 0,
      roundStreakMax: 0,
      roundStreakCurrent: 0,
      roundWrongWords: [],
      answered: false,
      isCorrect: false,
      feedbackText: '',
      fillInput: '',
    });

    this._showRoundWord(0);
    wx.pageScrollTo({ scrollTop: 0, duration: 0 });
  },

  _startReviewRound() {
    const { roundWrongPool, roundWords } = this.data;
    const reviewWords = roundWords.filter(w => roundWrongPool.includes(w.id));

    this._studyPhaseStats = {
      correctCount: this.data.roundCorrectCount,
      wrongCount: this.data.roundWrongCount,
      streakMax: this.data.roundStreakMax,
      wordsLearned: this.data.roundTotal,
      wrongWords: [...(this.data.roundWrongWords || [])],
    };

    this.setData({
      roundPhase: 'review',
      roundWords: reviewWords,
      roundIndex: 0,
      roundTotal: reviewWords.length,
      roundWrongPool: [],
      roundCorrectCount: 0,
      roundWrongCount: 0,
      roundStreakMax: 0,
      roundStreakCurrent: 0,
      answered: false,
      isCorrect: false,
      feedbackText: '',
      fillInput: '',
    });

    this._showRoundWord(0);
    wx.pageScrollTo({ scrollTop: 0, duration: 0 });
  },

  _showSummary() {
    this._pauseTimer();

    let totalCorrect = this.data.roundCorrectCount;
    let totalWrong = this.data.roundWrongCount;
    let totalStreakMax = this.data.roundStreakMax;
    let wordsLearned = this.data.roundTotal;
    let allWrongWords = [...(this.data.roundWrongWords || [])];

    if (this._studyPhaseStats) {
      totalCorrect += this._studyPhaseStats.correctCount;
      totalWrong += this._studyPhaseStats.wrongCount;
      totalStreakMax = Math.max(totalStreakMax, this._studyPhaseStats.streakMax);
      wordsLearned = this._studyPhaseStats.wordsLearned;
      const existIds = new Set(allWrongWords.map(w => w.id));
      this._studyPhaseStats.wrongWords.forEach(w => {
        if (!existIds.has(w.id)) {
          allWrongWords.push(w);
          existIds.add(w.id);
        }
      });
    }

    const totalAnswered = totalCorrect + totalWrong;
    const accuracy = totalAnswered > 0 ? Math.round(totalCorrect / totalAnswered * 100) : 0;

    let encourageText = '继续加油！';
    if (accuracy === 100) {
      encourageText = '太棒了，全对！';
    } else if (accuracy >= 80) {
      encourageText = '表现不错，继续保持！';
    } else if (accuracy >= 60) {
      encourageText = '还不错，再接再厉！';
    }

    const wrongWordsForDisplay = allWrongWords.slice(0, 5).map(w => ({
      word: w.word,
      meaning: w.meaning,
    }));

    this.setData({
      roundPhase: 'done',
      summaryAccuracy: accuracy,
      summaryCorrect: totalCorrect,
      summaryWrong: totalWrong,
      summaryStreakMax: totalStreakMax,
      summaryWordsLearned: wordsLearned,
      summaryWrongWords: wrongWordsForDisplay,
      summaryEncourage: encourageText,
    });

    wx.pageScrollTo({ scrollTop: 0, duration: 0 });
  },

  onNextRound() {
    const progress = this._savedProgress;
    const allWords = this._allWords;

    if (progress >= allWords.length - 1) {
      this._startNewRound(0, allWords);
    } else {
      this._startNewRound(progress + 1, allWords);
    }
    wx.pageScrollTo({ scrollTop: 0, duration: 0 });
  },

  switchMode(e) {
    const { mode } = e.currentTarget.dataset;
    if (!mode || mode === this.data.mode) return;

    if (this.data.roundPhase === 'done') {
      this.setData({ mode }, () => {
        const progress = this._savedProgress;
        const allWords = this._allWords;
        if (progress >= allWords.length - 1) {
          this._startNewRound(0, allWords);
        } else {
          this._startNewRound(progress, allWords);
        }
      });
      return;
    }

    this.setData({ mode }, () => {
      this._showRoundWord(this.data.roundIndex);
    });
  },

  toggleExamples() {
    if (this.data.mode === 'test' && !this.data.answered) return;
    this.setData({ showExamples: !this.data.showExamples });
  },

  toggleExercise() {
    if (this.data.mode === 'test' && this.data.currentExercise && !this.data.answered) return;
    this.setData({ showExercise: !this.data.showExercise });
  },

  selectAnswer(e) {
    const { answer } = e.currentTarget.dataset;
    this.setData({ selectedAnswer: answer, exerciseRevealed: true });
  },

  onSelectChoice(e) {
    const { key } = e.currentTarget.dataset;
    const { answered, currentExercise } = this.data;
    if (answered || !currentExercise) return;

    const isCorrect = this._isChoiceCorrect(key, currentExercise.answer);
    this._recordAnswerResult({
      answered: true,
      feedbackText: isCorrect ? '回答正确，继续保持。' : '这题答错了，看看正确答案。',
      isCorrect,
      selectedAnswer: key,
      showExamples: true,
      showExercise: true,
      exerciseRevealed: true,
    });
  },

  _isChoiceCorrect(selectedKey, answer) {
    if (!answer) return false;
    // 新格式: answer 是 "A"/"B" 等选项 key，直接比较
    if (selectedKey === answer) return true;
    // 兼容旧格式: answer 可能是选项文本
    const selectedOption = this.data.choiceOptions.find(item => item.key === selectedKey);
    return !!selectedOption && selectedOption.text === answer;
  },

  onFillInput(e) {
    this.setData({ fillInput: e.detail.value });
  },

  onSubmitFill() {
    const { fillInput, answered, currentExercise, currentWord } = this.data;
    if (answered || !currentExercise) return;

    const input = (fillInput || '').trim();
    if (!input) {
      wx.showToast({ title: '请输入答案', icon: 'none' });
      return;
    }

    const isCorrect = this._isFillCorrect(input, currentExercise.answer, currentWord);
    this._recordAnswerResult({
      answered: true,
      feedbackText: isCorrect ? '回答正确，继续保持。' : '这题答错了，看看正确答案。',
      isCorrect,
      showExamples: true,
      showExercise: true,
      exerciseRevealed: true,
    });
  },

  _isFillCorrect(userInput, answer, word) {
    const input = userInput.toLowerCase();

    const acceptedList = (answer || '').split(' / ').map(a => {
      return a.replace(/[（(].+?[）)]/g, '').trim().toLowerCase();
    }).filter(Boolean);

    if (acceptedList.includes(input)) return true;

    if (word && word.alternatives && word.alternatives.length > 0) {
      if (word.alternatives.some(alt => alt.trim().toLowerCase() === input)) return true;
    }

    return false;
  },

  _recordAnswerResult(extraState) {
    const isCorrect = !!extraState.isCorrect;
    const { mode } = this.data;

    const setId = this._setId;
    const currentWord = this.data.currentWord;
    if (setId && currentWord) {
      mastery.recordAnswer(setId, currentWord, isCorrect);
      mastery.recordDailyAnswer(isCorrect);
    }

    const updateObj = {
      ...extraState,
      nextButtonText: '下一个',
    };

    if (mode === 'test') {
      const newCorrect = this.data.roundCorrectCount + (isCorrect ? 1 : 0);
      const newWrong = this.data.roundWrongCount + (isCorrect ? 0 : 1);
      const newStreak = isCorrect ? (this.data.roundStreakCurrent || 0) + 1 : 0;
      const newStreakMax = Math.max(this.data.roundStreakMax, newStreak);

      updateObj.roundCorrectCount = newCorrect;
      updateObj.roundWrongCount = newWrong;
      updateObj.roundStreakCurrent = newStreak;
      updateObj.roundStreakMax = newStreakMax;

      if (!isCorrect && currentWord) {
        const pool = this.data.roundWrongPool;
        if (!pool.includes(currentWord.id)) {
          pool.push(currentWord.id);
          updateObj.roundWrongPool = pool;
        }

        const wrongWords = this.data.roundWrongWords || [];
        if (!wrongWords.find(w => w.id === currentWord.id)) {
          wrongWords.push({
            id: currentWord.id,
            word: currentWord.word,
            meaning: currentWord.meaning,
          });
          updateObj.roundWrongWords = wrongWords;
        }
      }
    }

    this.setData(updateObj);
  },

  _buildExerciseState(word) {
    if (!word || !word.exercises || word.exercises.length === 0) {
      return {
        currentExercise: null,
        currentExerciseAnswerDisplay: '',
        choiceOptions: [],
      };
    }

    let exercise;
    if (this.data.mode === 'test') {
      exercise = word.exercises.find(e => e.type === 'choice') || word.exercises[0];
    } else {
      exercise = word.exercises[0];
    }
    if (!exercise) {
      return {
        currentExercise: null,
        currentExerciseAnswerDisplay: '',
        choiceOptions: [],
      };
    }

    if (exercise.type === 'choice') {
      // 新结构化格式：有 prompt + options
      if (exercise.options && exercise.options.length > 0) {
        const matchedOption = exercise.options.find(
          item => item.key === exercise.answer || item.text === exercise.answer
        );
        return {
          currentExercise: exercise,
          currentExerciseAnswerDisplay: matchedOption
            ? `${matchedOption.key}. ${matchedOption.text}`
            : exercise.answer,
          choiceOptions: exercise.options,
        };
      }
      // 兼容旧格式：有 question 但没有 options，降级解析
      const parsed = this._parseLegacyChoice(exercise.question);
      const matchedOption = parsed.options.find(
        item => item.key === exercise.answer || item.text === exercise.answer
      );
      return {
        currentExercise: {
          ...exercise,
          prompt: parsed.prompt,
        },
        currentExerciseAnswerDisplay: matchedOption
          ? `${matchedOption.key}. ${matchedOption.text}`
          : exercise.answer,
        choiceOptions: parsed.options,
      };
    }

    // 填空题
    return {
      currentExercise: {
        ...exercise,
        prompt: exercise.prompt || exercise.question,
      },
      currentExerciseAnswerDisplay: exercise.answer || '',
      choiceOptions: [],
    };
  },

  // 兼容旧格式：question 文本中嵌入选项
  _parseLegacyChoice(rawQuestion) {
    const lines = (rawQuestion || '').split('\n').map(l => l.trim()).filter(Boolean);
    const optionPattern = /^([A-Z])\.\s*(.+)$/;
    const firstOptionIndex = lines.findIndex(line => optionPattern.test(line));
    const promptLines = firstOptionIndex === -1 ? lines : lines.slice(0, firstOptionIndex);
    const optionLines = firstOptionIndex === -1 ? [] : lines.slice(firstOptionIndex);
    const options = optionLines.map(line => {
      const m = line.match(optionPattern);
      return m ? { key: m[1], text: m[2] } : null;
    }).filter(Boolean);

    return { prompt: promptLines.join('\n'), options };
  },

  goHome() {
    this._pauseTimer();
    wx.reLaunch({ url: '/pages/home/index' });
  },

  switchRange() {
    wx.navigateTo({ url: '/pages/home/index?from=quiz' });
  },

  goStats() {
    wx.navigateTo({ url: '/pages/stats/index' });
  },

  onSharePoster() {
    const totalDays = mastery.getTotalStudyDays();
    this.setData({
      streakDaysForPoster: totalDays,
      showPoster: true,
    });
  },

  onClosePoster() {
    this.setData({ showPoster: false });
  },
});
