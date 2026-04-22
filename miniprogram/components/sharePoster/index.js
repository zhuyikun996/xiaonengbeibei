// components/sharePoster/index.js
const quotes = require('../../data/quotes');
console.log('[sharePoster] quotes loaded:', Array.isArray(quotes), quotes ? quotes.length : 'null');

Component({
  properties: {
    streakDays: {
      type: Number,
      value: 0,
    },
    show: {
      type: Boolean,
      value: false,
    },
  },

  data: {
    quote: null,
    emoji: '✌️',
    emojiList: ['✌️', '🎉', '🔥', '💪', '🌟', '🎯', '🏅', '🚀', '📖', '⭐'],
  },

  observers: {
    'show': function (val) {
      if (val) {
        this._pickQuote();
        setTimeout(() => {
          this._drawPosterToCanvas();
        }, 100);
      }
    },
  },

  methods: {
    _pickQuote() {
      const index = Math.floor(Math.random() * quotes.length);
      const emoji = this.data.emojiList[Math.floor(Math.random() * this.data.emojiList.length)];
      this.setData({ quote: quotes[index], emoji });
    },

    onClose() {
      this.triggerEvent('close');
    },

    onSaveImage() {
      this._generateImage()
        .then((tempPath) => this._saveImageToPhotosAlbum(tempPath))
        .catch(() => {});
    },

    onShareFriend() {
      this._generateImage()
        .then((tempPath) => {
          wx.showShareImageMenu({
            path: tempPath,
            success: () => {},
            fail: () => {
              this._saveImageToPhotosAlbum(tempPath, '已保存到相册，请手动分享');
            },
          });
        })
        .catch(() => {});
    },

    _drawPosterToCanvas() {
      const query = this.createSelectorQuery();
      query.select('#posterCanvas')
        .fields({ node: true, size: true })
        .exec((res) => {
          if (!res[0] || !res[0].node) return;
          const canvas = res[0].node;
          const ctx = canvas.getContext('2d');
          const dpr = wx.getWindowInfo().pixelRatio;
          const width = 600;
          const height = 1000;

          canvas.width = width * dpr;
          canvas.height = height * dpr;
          ctx.scale(dpr, dpr);

          // 同时加载 app_icon 和小程序码
          const loadImg = (src) => new Promise((resolve) => {
            const img = canvas.createImage();
            img.onload = () => {
              console.log('[sharePoster] image loaded:', src);
              resolve(img);
            };
            img.onerror = (err) => {
              console.error('[sharePoster] image load failed:', src, err);
              resolve(null);
            };
            img.src = src;
          });

          Promise.all([
            loadImg('/images/qrcode.png'),
            loadImg('/images/icons/app_icon.png'),
          ]).then(([qrcodeImg, appIconImg]) => {
            console.log('[sharePoster] all images loaded, qrcode:', !!qrcodeImg, 'appIcon:', !!appIconImg);
            try {
              this._drawPoster(ctx, width, height, qrcodeImg, appIconImg);
              console.log('[sharePoster] _drawPoster completed');
            } catch (e) {
              console.error('[sharePoster] _drawPoster error:', e);
            }
          });
        });
    },

    _generateImage() {
      return new Promise((resolve, reject) => {
        const query = this.createSelectorQuery();
        query.select('#posterCanvas')
          .fields({ node: true, size: true })
          .exec((res) => {
            if (!res[0] || !res[0].node) {
              wx.showToast({ title: '海报生成失败', icon: 'none' });
              reject(new Error('poster canvas not found'));
              return;
            }
            const canvas = res[0].node;
            const width = res[0].width || canvas.width;
            const height = res[0].height || canvas.height;

            wx.canvasToTempFilePath({
              canvas,
              x: 0,
              y: 0,
              width,
              height,
              destWidth: canvas.width,
              destHeight: canvas.height,
              fileType: 'png',
              success: (res) => {
                resolve(res.tempFilePath);
              },
              fail: (err) => {
                console.error('[sharePoster] canvasToTempFilePath failed', err);
                wx.showToast({ title: '海报生成失败', icon: 'none' });
                reject(err);
              },
            }, this);
          });
      });
    },

    _saveImageToPhotosAlbum(filePath, successTitle = '已保存到相册') {
      const doSave = () => {
        wx.saveImageToPhotosAlbum({
          filePath,
          success: () => {
            wx.showToast({ title: successTitle, icon: 'success' });
          },
          fail: (err) => {
            console.error('[sharePoster] saveImageToPhotosAlbum failed', err);
            if (err && err.errMsg && err.errMsg.includes('auth deny')) {
              this._showAlbumPermissionModal();
              return;
            }
            wx.showToast({ title: '保存失败，请重试', icon: 'none' });
          },
        });
      };

      wx.getSetting({
        success: ({ authSetting }) => {
          const hasPermission = authSetting['scope.writePhotosAlbum'];
          if (hasPermission === true) {
            doSave();
            return;
          }

          if (hasPermission === false) {
            this._showAlbumPermissionModal();
            return;
          }

          wx.authorize({
            scope: 'scope.writePhotosAlbum',
            success: doSave,
            fail: () => {
              this._showAlbumPermissionModal();
            },
          });
        },
        fail: () => {
          doSave();
        },
      });
    },

    _showAlbumPermissionModal() {
      wx.showModal({
        title: '提示',
        content: '需要授权保存到相册，请在设置中开启',
        confirmText: '去设置',
        success: (res) => {
          if (res.confirm) {
            wx.openSetting();
          }
        },
      });
    },

    _drawPoster(ctx, width, height, qrcodeImg, appIconImg) {
      const { streakDays, quote } = this.data;
      const cardX = 40;
      const cardW = 520;
      const cardR = 24;
      const cardGap = 30;

      // --- 渐变背景 ---
      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, '#FFF3C4');
      gradient.addColorStop(0.5, '#FFE5A0');
      gradient.addColorStop(1, '#FFD4A0');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // --- Emoji ---
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '90px sans-serif';
      ctx.fillText(this.data.emoji, width / 2, 110);

      // --- 打卡数字卡片 ---
      const streakCardY = 190;
      const streakCardH = 250;
      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.08)';
      ctx.shadowBlur = 20;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 4;
      ctx.fillStyle = '#FFFFFF';
      this._roundRect(ctx, cardX, streakCardY, cardW, streakCardH, cardR);
      ctx.fill();
      ctx.restore();

      // "连续打卡" 标签
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = '#999999';
      ctx.font = '28px sans-serif';
      ctx.fillText('连续打卡', width / 2, streakCardY + 60);

      // 打卡天数数字
      ctx.fillStyle = '#333333';
      ctx.font = 'bold 140px sans-serif';
      const numStr = String(streakDays);
      const numW = ctx.measureText(numStr).width;
      ctx.fillText(numStr, width / 2, streakCardY + 185);

      // "天" 后缀
      ctx.textAlign = 'left';
      ctx.fillStyle = '#666666';
      ctx.font = '32px sans-serif';
      ctx.fillText('天', width / 2 + numW / 2 + 8, streakCardY + 165);

      // --- 名言卡片 ---
      const quoteCardY = streakCardY + streakCardH + cardGap;
      const quoteCardH = 280;
      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.08)';
      ctx.shadowBlur = 20;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 4;
      ctx.fillStyle = '#FFFFFF';
      this._roundRect(ctx, cardX, quoteCardY, cardW, quoteCardH, cardR);
      ctx.fill();
      ctx.restore();

      if (quote) {
        const qpx = 40;
        let curY = quoteCardY + 40;
        const maxW = cardW - qpx * 2;

        ctx.textAlign = 'left';
        ctx.fillStyle = '#333333';
        ctx.font = 'bold 20px sans-serif';
        const enLines = this._wrapText(ctx, '"' + quote.en + '"', maxW);
        enLines.forEach((line, i) => {
          ctx.fillText(line, cardX + qpx, curY + i * 30);
        });

        curY += enLines.length * 30 + 16;
        ctx.fillStyle = '#666666';
        ctx.font = '16px sans-serif';
        const zhLines = this._wrapText(ctx, quote.zh, maxW);
        zhLines.forEach((line, i) => {
          ctx.fillText(line, cardX + qpx, curY + i * 26);
        });

        if (quote.author) {
          curY += zhLines.length * 26 + 12;
          ctx.fillStyle = '#4A90D9';
          ctx.font = 'italic 16px sans-serif';
          ctx.fillText('-- ' + quote.author, cardX + qpx, curY);
        }
      }

      // --- 品牌卡片 ---
      const brandCardY = quoteCardY + quoteCardH + cardGap;
      const brandCardH = 180;
      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.08)';
      ctx.shadowBlur = 20;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 4;
      ctx.fillStyle = '#FFFFFF';
      this._roundRect(ctx, cardX, brandCardY, cardW, brandCardH, cardR);
      ctx.fill();
      ctx.restore();

      // App icon
      const iconS = 48;
      const iconX = cardX + 30;
      const iconY = brandCardY + (brandCardH - iconS) / 2;
      if (appIconImg) {
        ctx.save();
        this._roundRect(ctx, iconX, iconY, iconS, iconS, 10);
        ctx.clip();
        ctx.drawImage(appIconImg, iconX, iconY, iconS, iconS);
        ctx.restore();
      }

      // App 名称
      ctx.textAlign = 'left';
      ctx.fillStyle = '#333333';
      ctx.font = 'bold 22px sans-serif';
      ctx.fillText('小能背背', iconX + iconS + 14, iconY + 22);

      // Slogan
      ctx.fillStyle = '#999999';
      ctx.font = '14px sans-serif';
      ctx.fillText('每天进步一点点', iconX + iconS + 14, iconY + 44);

      // 小程序码
      const qrS = 110;
      const qrX = cardX + cardW - qrS - 30;
      const qrY = brandCardY + (brandCardH - qrS) / 2;
      if (qrcodeImg) {
        ctx.save();
        this._roundRect(ctx, qrX, qrY, qrS, qrS, 12);
        ctx.clip();
        ctx.drawImage(qrcodeImg, qrX, qrY, qrS, qrS);
        ctx.restore();
      } else {
        ctx.fillStyle = '#EEEEEE';
        this._roundRect(ctx, qrX, qrY, qrS, qrS, 12);
        ctx.fill();
        ctx.fillStyle = '#AAAAAA';
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('小程序码', qrX + qrS / 2, qrY + qrS / 2 + 5);
      }
    },

    _wrapText(ctx, text, maxWidth) {
      const lines = [];
      let currentLine = '';
      for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const testLine = currentLine + char;
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && currentLine.length > 0) {
          lines.push(currentLine);
          currentLine = char;
        } else {
          currentLine = testLine;
        }
      }
      if (currentLine) {
        lines.push(currentLine);
      }
      return lines;
    },

    _roundRect(ctx, x, y, w, h, r) {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
    },
  },
});
