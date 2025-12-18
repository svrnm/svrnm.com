/**
 * System Direct Animation (Rough.js hand-drawn style)
 * Visualizes: User directly interacting with their own system (no telemetry needed)
 * User -> System -> Response back to User
 * On error: User gets angry -> lightbulb -> sends config change
 */
(function() {
  'use strict';

  window.registerAnimation('system-direct', function(container, params) {
    // Wait for Rough.js to be available
    if (typeof rough === 'undefined') {
      setTimeout(function() {
        window.registerAnimation('system-direct', arguments.callee);
      }, 100);
      return;
    }

    // Configuration
    const ERROR_RATE = 0.25;
    const FORCE_ERROR_EVERY = 3;

    // Get container dimensions
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Create canvas for static elements
    const staticCanvas = document.createElement('canvas');
    staticCanvas.width = width;
    staticCanvas.height = height;
    const staticCtx = staticCanvas.getContext('2d');
    const staticRc = rough.canvas(staticCanvas);

    // Create canvas for animated elements
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    container.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    const rc = rough.canvas(canvas);

    // Check for dark mode
    const isDarkMode = document.body.classList.contains('dark') || 
                       window.matchMedia('(prefers-color-scheme: dark)').matches;

    // Colors
    const colors = {
      background: isDarkMode ? '#1e1e1e' : '#f5f5f5',
      text: isDarkMode ? '#e0e0e0' : '#333333',
      user: isDarkMode ? '#64b5f6' : '#2196f3',
      system: isDarkMode ? '#81c784' : '#4caf50',
      input: isDarkMode ? '#ffb74d' : '#ff9800',
      output: isDarkMode ? '#4dd0e1' : '#00bcd4',
      configChange: isDarkMode ? '#aed581' : '#8bc34a',
      error: isDarkMode ? '#ef5350' : '#f44336',
      face: isDarkMode ? '#1e1e1e' : '#ffffff',
      lightbulb: isDarkMode ? '#ffeb3b' : '#ffc107',
    };

    // Fixed seeds
    const SEEDS = {
      userHead: 2001, userBody: 2002, system: 2003,
      inputPath: 2006, responsePath: 2007, configPath: 2008,
      legendInput: 2009, legendOutput: 2010, legendConfig: 2011,
    };

    const roughOptions = { roughness: 1.5, bowing: 2, strokeWidth: 2 };

    // Layout - centered, simpler
    const centerX = width / 2;
    const centerY = height * 0.42;
    const userX = width * 0.25;
    const systemX = width * 0.55;
    const systemWidth = width * 0.22;
    const systemHeight = 65;
    const systemRight = systemX + systemWidth;

    // User emotion state
    let userEmotion = 'neutral';
    let userEmotionTimeout = null;
    let showLightbulb = false;
    let lightbulbTimeout = null;

    // Queues
    const requests = [];
    const configChanges = [];
    let requestId = 0;
    let configChangeId = 0;
    let requestsSinceLastError = 0;

    // States
    const STATE_INPUT = 'input';
    const STATE_PROCESSING = 'processing';
    const STATE_RESPONSE = 'response';
    const STATE_DONE = 'done';

    function createRequest() {
      const nums = [
        Math.floor(Math.random() * 9) + 1,
        Math.floor(Math.random() * 9) + 1,
        Math.floor(Math.random() * 9) + 1
      ];
      const forceError = requestsSinceLastError >= FORCE_ERROR_EVERY - 1;
      const hasError = forceError || Math.random() < ERROR_RATE;
      
      if (hasError) {
        requestsSinceLastError = 0;
      } else {
        requestsSinceLastError++;
      }
      
      const correctSum = nums[0] + nums[1] + nums[2];
      const displaySum = hasError ? correctSum + Math.floor(Math.random() * 5) + 1 : correctSum;
      const delay = Math.floor(Math.random() * 200) + 50;

      return {
        id: requestId++,
        nums: nums,
        hasError: hasError,
        correctSum: correctSum,
        displaySum: displaySum,
        delay: delay,
        state: STATE_INPUT,
        progress: 0,
        speed: 0.014 + Math.random() * 0.004,
        seed: Math.floor(Math.random() * 10000),
        responseProgress: 0,
      };
    }

    function createConfigChange() {
      return {
        id: configChangeId++,
        state: STATE_INPUT,
        progress: 0,
        speed: 0.018,
        seed: Math.floor(Math.random() * 10000),
      };
    }

    let lastRequestTime = 0;
    const requestInterval = 3000;

    function maybeCreateRequest(time) {
      // Don't create new requests while user is dealing with an error
      // (showing cloud, lightbulb, or sending config change)
      const isFixingError = userEmotion === 'sad' || showLightbulb || configChanges.length > 0;
      
      if (!isFixingError && time - lastRequestTime > requestInterval && requests.filter(r => r.state !== STATE_DONE).length < 2) {
        requests.push(createRequest());
        lastRequestTime = time;
      }
    }

    // Input goes straight to system
    function getInputPosition(progress) {
      const startX = userX + 50;
      const endX = systemX - 5;
      return {
        x: startX + (endX - startX) * progress,
        y: centerY
      };
    }

    // Response comes back around the bottom
    function getResponsePosition(progress) {
      const startX = systemRight;
      const startY = centerY + 15;
      const endX = userX + 50;
      const bottomY = centerY + 55;
      
      if (progress < 0.2) {
        const p = progress / 0.2;
        return { x: startX + 30 * p, y: startY };
      } else if (progress < 0.4) {
        const p = (progress - 0.2) / 0.2;
        return { x: startX + 30, y: startY + (bottomY - startY) * p };
      } else if (progress < 0.8) {
        const p = (progress - 0.4) / 0.4;
        return { x: startX + 30 - (startX + 30 - endX) * p, y: bottomY };
      } else {
        const p = (progress - 0.8) / 0.2;
        return { x: endX, y: bottomY - (bottomY - centerY) * p };
      }
    }

    // Config change goes from user to top of system
    function getConfigChangePosition(progress) {
      const startX = userX + 30;
      const startY = centerY - 40;
      const endX = systemX + systemWidth / 2;
      const endY = centerY - systemHeight / 2 - 5;
      const topY = Math.min(startY, endY) - 20;
      
      if (progress < 0.3) {
        const p = progress / 0.3;
        return { x: startX, y: startY - (startY - topY) * p };
      } else if (progress < 0.7) {
        const p = (progress - 0.3) / 0.4;
        return { x: startX + (endX - startX) * p, y: topY };
      } else {
        const p = (progress - 0.7) / 0.3;
        return { x: endX, y: topY + (endY - topY) * p };
      }
    }

    function drawStaticElements() {
      staticCtx.fillStyle = colors.background;
      staticCtx.fillRect(0, 0, width, height);

      // Input path (straight line)
      staticRc.line(userX + 50, centerY, systemX - 5, centerY, {
        stroke: colors.input,
        strokeWidth: 1.5,
        roughness: 1,
        strokeLineDash: [5, 5],
        seed: SEEDS.inputPath,
      });

      // Response path (around the bottom)
      const responsePoints = [];
      for (let t = 0; t <= 1; t += 0.03) {
        const pos = getResponsePosition(t);
        responsePoints.push([pos.x, pos.y]);
      }
      staticRc.linearPath(responsePoints, {
        stroke: colors.output,
        strokeWidth: 1.5,
        roughness: 0.8,
        strokeLineDash: [5, 5],
        seed: SEEDS.responsePath,
      });

      // Config change path (over the top)
      const configPoints = [];
      for (let t = 0; t <= 1; t += 0.03) {
        const pos = getConfigChangePosition(t);
        configPoints.push([pos.x, pos.y]);
      }
      staticRc.linearPath(configPoints, {
        stroke: colors.configChange,
        strokeWidth: 1.5,
        roughness: 0.8,
        strokeLineDash: [5, 5],
        seed: SEEDS.configPath,
      });

      // Draw System as a monitor (user's computer)
      const monitorW = systemWidth;
      const monitorH = systemHeight;
      const monitorX = systemX;
      const monitorY = centerY - monitorH/2;
      
      // Monitor screen
      staticRc.rectangle(monitorX, monitorY, monitorW, monitorH, {
        fill: colors.system,
        fillStyle: 'solid',
        stroke: colors.system,
        ...roughOptions,
        roughness: 1.5,
        seed: SEEDS.system,
      });
      
      // Screen inner area (darker)
      const screenPadding = 6;
      staticCtx.fillStyle = isDarkMode ? '#1a3d1a' : '#2d5a2d';
      staticCtx.fillRect(
        monitorX + screenPadding,
        monitorY + screenPadding,
        monitorW - screenPadding * 2,
        monitorH - screenPadding * 2 - 8
      );
      
      // Terminal-style content lines
      staticCtx.fillStyle = '#a0d0a0';
      const lineStartX = monitorX + screenPadding + 4;
      const lineWidth = monitorW - screenPadding * 2 - 8;
      staticCtx.fillRect(lineStartX, monitorY + 12, lineWidth * 0.7, 3);
      staticCtx.fillRect(lineStartX, monitorY + 20, lineWidth * 0.5, 3);
      staticCtx.fillRect(lineStartX, monitorY + 28, lineWidth * 0.8, 3);
      staticCtx.fillRect(lineStartX, monitorY + 36, lineWidth * 0.4, 3);
      
      // Blinking cursor
      staticCtx.fillStyle = '#4ade80';
      staticCtx.fillRect(lineStartX, monitorY + 44, 6, 3);
      
      // Monitor stand neck
      const standNeckW = 16;
      const standNeckH = 10;
      staticCtx.fillStyle = colors.system;
      staticCtx.fillRect(
        monitorX + monitorW/2 - standNeckW/2,
        monitorY + monitorH,
        standNeckW,
        standNeckH
      );
      
      // Monitor stand base
      const standBaseW = 40;
      const standBaseH = 6;
      staticRc.rectangle(
        monitorX + monitorW/2 - standBaseW/2,
        monitorY + monitorH + standNeckH,
        standBaseW,
        standBaseH,
        {
          fill: colors.system,
          fillStyle: 'solid',
          stroke: colors.system,
          roughness: 1,
          seed: SEEDS.system + 5,
        }
      );
      
      staticCtx.fillStyle = colors.text;
      staticCtx.font = 'italic 11px "Comic Sans MS", cursive, sans-serif';
      staticCtx.textAlign = 'center';
      staticCtx.fillText('System', monitorX + monitorW/2, monitorY + monitorH + standNeckH + standBaseH + 14);

      // Legend
      const legendY = height - 18;
      const items = [
        { color: colors.input, label: 'Input (Request)' },
        { color: colors.configChange, label: 'Input (Config Change)' },
        { color: colors.output, label: 'Output (non-telemetry)' },
      ];
      
      staticCtx.font = 'italic 9px "Comic Sans MS", cursive, sans-serif';
      const totalWidth = items.reduce((acc, item) => acc + staticCtx.measureText(item.label).width + 24, 0);
      let legendX = (width - totalWidth) / 2;
      
      items.forEach((item, i) => {
        staticRc.circle(legendX + 6, legendY, 9, {
          fill: item.color,
          fillStyle: 'solid',
          stroke: item.color,
          roughness: 0.8,
          seed: SEEDS.legendInput + i,
        });
        
        staticCtx.fillStyle = colors.text;
        staticCtx.textAlign = 'left';
        staticCtx.fillText(item.label, legendX + 14, legendY + 3);
        
        legendX += staticCtx.measureText(item.label).width + 26;
      });
    }

    function drawUser(emotion, showBulb) {
      const userDrawX = userX;
      const userDrawY = centerY;
      
      // Cloud with thunder when sad
      if (emotion === 'sad' && !showBulb) {
        const cloudX = userDrawX;
        const cloudY = userDrawY - 48;
        
        ctx.fillStyle = '#555';
        ctx.beginPath();
        ctx.arc(cloudX - 8, cloudY, 8, 0, Math.PI * 2);
        ctx.arc(cloudX + 6, cloudY - 2, 9, 0, Math.PI * 2);
        ctx.arc(cloudX + 0, cloudY - 6, 7, 0, Math.PI * 2);
        ctx.arc(cloudX - 10, cloudY - 4, 6, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.moveTo(cloudX + 2, cloudY + 5);
        ctx.lineTo(cloudX - 3, cloudY + 12);
        ctx.lineTo(cloudX + 1, cloudY + 12);
        ctx.lineTo(cloudX - 4, cloudY + 20);
        ctx.lineTo(cloudX + 4, cloudY + 10);
        ctx.lineTo(cloudX + 0, cloudY + 10);
        ctx.lineTo(cloudX + 5, cloudY + 5);
        ctx.closePath();
        ctx.fill();
      }
      
      // Lightbulb when having idea
      if (showBulb) {
        const bulbX = userDrawX;
        const bulbY = userDrawY - 50;
        
        ctx.fillStyle = colors.lightbulb + '40';
        ctx.beginPath();
        ctx.arc(bulbX, bulbY, 14, 0, Math.PI * 2);
        ctx.fill();
        
        rc.circle(bulbX, bulbY, 18, {
          fill: colors.lightbulb,
          fillStyle: 'solid',
          stroke: colors.lightbulb,
          roughness: 0.8,
          seed: 9999,
        });
        
        ctx.fillStyle = '#666';
        ctx.fillRect(bulbX - 4, bulbY + 7, 8, 5);
        
        ctx.strokeStyle = colors.lightbulb;
        ctx.lineWidth = 2;
        const rays = [[0, -12], [-10, -7], [10, -7], [-11, 4], [11, 4]];
        rays.forEach(([dx, dy]) => {
          ctx.beginPath();
          ctx.moveTo(bulbX + dx * 0.7, bulbY + dy * 0.7);
          ctx.lineTo(bulbX + dx * 1.3, bulbY + dy * 1.3);
          ctx.stroke();
        });
      }
      
      // Head
      rc.circle(userDrawX, userDrawY - 18, 26, {
        fill: colors.user,
        fillStyle: 'solid',
        stroke: colors.user,
        ...roughOptions,
        seed: SEEDS.userHead,
      });
      
      // Face
      ctx.fillStyle = colors.face;
      ctx.beginPath();
      ctx.arc(userDrawX, userDrawY - 18, 10, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.fillStyle = colors.text;
      ctx.beginPath();
      ctx.arc(userDrawX - 4, userDrawY - 21, 2, 0, Math.PI * 2);
      ctx.arc(userDrawX + 4, userDrawY - 21, 2, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.strokeStyle = colors.text;
      ctx.lineWidth = 1.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      
      if (emotion === 'happy') {
        ctx.arc(userDrawX, userDrawY - 14, 4, 0.2, Math.PI - 0.2);
      } else if (emotion === 'sad') {
        ctx.arc(userDrawX, userDrawY - 10, 4, Math.PI + 0.3, -0.3);
      } else {
        ctx.moveTo(userDrawX - 4, userDrawY - 13);
        ctx.lineTo(userDrawX + 4, userDrawY - 13);
      }
      ctx.stroke();
      
      // Body
      rc.rectangle(userDrawX - 16, userDrawY + 2, 32, 32, {
        fill: colors.user,
        fillStyle: 'solid',
        stroke: colors.user,
        roughness: 1.2,
        seed: SEEDS.userBody,
      });

      // Arms
      rc.line(userDrawX + 16, userDrawY + 8, userDrawX + 32, userDrawY, {
        stroke: colors.user,
        strokeWidth: 6,
        roughness: 1,
        seed: SEEDS.userBody + 1,
      });
      rc.line(userDrawX - 16, userDrawY + 8, userDrawX - 28, userDrawY + 22, {
        stroke: colors.user,
        strokeWidth: 6,
        roughness: 1,
        seed: SEEDS.userBody + 2,
      });

      ctx.fillStyle = colors.text;
      ctx.font = 'italic 11px "Comic Sans MS", cursive, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('User', userDrawX, userDrawY + 52);
    }

    function drawInputBubble(request, pos) {
      const text = request.nums.join(', ');
      
      rc.ellipse(pos.x, pos.y, 50, 26, {
        fill: colors.input,
        fillStyle: 'solid',
        stroke: colors.input,
        roughness: 1,
        seed: request.seed,
      });
      
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, pos.x, pos.y);
    }

    function drawResponseBubble(request, pos) {
      const color = request.hasError ? colors.error : colors.output;
      
      rc.ellipse(pos.x, pos.y, 32, 22, {
        fill: color,
        fillStyle: 'solid',
        stroke: color,
        roughness: 1,
        seed: request.seed + 100,
      });
      
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('=' + request.displaySum, pos.x, pos.y);
    }

    function drawConfigChangeBubble(configChange, pos) {
      rc.ellipse(pos.x, pos.y, 36, 20, {
        fill: colors.configChange,
        fillStyle: 'solid',
        stroke: colors.configChange,
        roughness: 1,
        seed: configChange.seed,
      });
      
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('fix', pos.x, pos.y);
    }

    function drawProcessingIndicator() {
      const dots = Math.floor((Date.now() / 200) % 4);
      const text = '.'.repeat(dots);
      
      ctx.fillStyle = colors.text;
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, systemX + systemWidth/2, centerY + 22);
    }

    function setUserReaction(hasError) {
      if (hasError) {
        userEmotion = 'sad';
        
        // After being sad, get lightbulb idea
        if (userEmotionTimeout) clearTimeout(userEmotionTimeout);
        userEmotionTimeout = setTimeout(function() {
          showLightbulb = true;
          
          // After lightbulb, send config change
          if (lightbulbTimeout) clearTimeout(lightbulbTimeout);
          lightbulbTimeout = setTimeout(function() {
            configChanges.push(createConfigChange());
            showLightbulb = false;
            userEmotion = 'neutral';
          }, 1000);
        }, 1200);
      } else {
        userEmotion = 'happy';
        
        if (userEmotionTimeout) clearTimeout(userEmotionTimeout);
        userEmotionTimeout = setTimeout(function() {
          userEmotion = 'neutral';
        }, 2000);
      }
    }

    function updateRequest(request, time) {
      switch (request.state) {
        case STATE_INPUT:
          request.progress += request.speed;
          if (request.progress >= 1) {
            request.state = STATE_PROCESSING;
            request.progress = 0;
            request.processingStart = time;
          } else {
            const pos = getInputPosition(request.progress);
            drawInputBubble(request, pos);
          }
          break;

        case STATE_PROCESSING:
          const processingTime = request.delay * 3;
          if (time - request.processingStart > processingTime) {
            request.state = STATE_RESPONSE;
            request.responseProgress = 0;
          } else {
            drawProcessingIndicator();
          }
          break;

        case STATE_RESPONSE:
          request.responseProgress += request.speed * 0.9;
          
          if (request.responseProgress >= 1 && !request.reactionSet) {
            setUserReaction(request.hasError);
            request.reactionSet = true;
          }
          
          if (request.responseProgress < 1) {
            const pos = getResponsePosition(request.responseProgress);
            drawResponseBubble(request, pos);
          }
          
          if (request.responseProgress >= 1) {
            request.state = STATE_DONE;
          }
          break;
      }
    }

    function updateConfigChange(configChange) {
      configChange.progress += configChange.speed;
      
      if (configChange.progress >= 1) {
        configChange.state = STATE_DONE;
      } else {
        const pos = getConfigChangePosition(configChange.progress);
        drawConfigChangeBubble(configChange, pos);
      }
    }

    drawStaticElements();

    function draw(time) {
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(staticCanvas, 0, 0);
      
      drawUser(userEmotion, showLightbulb);
      
      maybeCreateRequest(time);
      
      for (let i = requests.length - 1; i >= 0; i--) {
        const request = requests[i];
        if (request.state === STATE_DONE) {
          requests.splice(i, 1);
        } else {
          updateRequest(request, time);
        }
      }
      
      for (let i = configChanges.length - 1; i >= 0; i--) {
        const cc = configChanges[i];
        if (cc.state === STATE_DONE) {
          configChanges.splice(i, 1);
        } else {
          updateConfigChange(cc);
        }
      }
      
      requestAnimationFrame(draw);
    }

    function handleResize() {
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight;
      if (canvas.width !== newWidth || canvas.height !== newHeight) {
        canvas.width = newWidth;
        canvas.height = newHeight;
        staticCanvas.width = newWidth;
        staticCanvas.height = newHeight;
        drawStaticElements();
      }
    }

    if (typeof ResizeObserver !== 'undefined') {
      const resizeObserver = new ResizeObserver(handleResize);
      resizeObserver.observe(container);
    }

    requestAnimationFrame(draw);
  });
})();
