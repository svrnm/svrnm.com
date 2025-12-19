/**
 * System with Outputs Animation (Rough.js hand-drawn style)
 * Visualizes: User -> System -> Response + Telemetry -> Operator reacts
 */
(function() {
  'use strict';

  window.registerAnimation('system-with-outputs', function(container, params) {
    // Wait for Rough.js to be available
    if (typeof rough === 'undefined') {
      setTimeout(function() {
        window.registerAnimation('system-with-outputs', arguments.callee);
      }, 100);
      return;
    }

    // Configuration
    const ERROR_RATE = 0.25; // 25% chance of error
    const FORCE_ERROR_EVERY = 3; // Force error at least every N requests

    // Get container dimensions
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Create canvas for static elements (drawn once)
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
      operator: isDarkMode ? '#ffb74d' : '#ff9800',
      system: isDarkMode ? '#81c784' : '#4caf50',
      observability: isDarkMode ? '#ba68c8' : '#9c27b0',
      input: isDarkMode ? '#ffb74d' : '#ff9800',
      output: isDarkMode ? '#4dd0e1' : '#00bcd4',
      telemetry: isDarkMode ? '#f06292' : '#e91e63',
      codeChange: isDarkMode ? '#aed581' : '#8bc34a',
      error: isDarkMode ? '#ef5350' : '#f44336',
      face: isDarkMode ? '#1e1e1e' : '#ffffff',
      lightbulb: isDarkMode ? '#ffeb3b' : '#ffc107',
    };

    // Fixed seeds for static elements
    const SEEDS = {
      userHead: 1001, userBody: 1002, system: 1003, observability: 1004,
      chart: 1005, inputPath: 1006, responsePath: 1007, telemetryPath: 1008,
      legendInput: 1009, legendOutput: 1010, legendTelemetry: 1011,
      operatorHead: 1012, operatorBody: 1013, codeChangePath: 1014,
      legendCodeChange: 1015, userScreen: 1016,
    };

    // Rough.js options
    const roughOptions = { roughness: 1.5, bowing: 2, strokeWidth: 2 };

    // Layout constants
    const padding = 25;
    const userX = padding + 40;
    const userScreenX = userX + 55; // User's computer screen
    const systemX = width * 0.32;
    const systemWidth = width * 0.14;
    const systemRight = systemX + systemWidth;
    const observabilityX = width * 0.72;
    const operatorX = observabilityX + 50; // Right beside the backend
    const userReturnX = userScreenX + 25;
    const centerY = height * 0.42;
    const systemHeight = 55;
    const userScreenY = centerY;
    const observabilityY = centerY;
    const operatorY = centerY + 5; // Same level, slightly lower
    
    // Separate output Y positions (from system)
    const responseStartY = centerY + 12;
    const telemetryStartY = centerY - 12;

    // User emotion state
    let userEmotion = 'neutral';
    let userEmotionTimeout = null;

    // Operator state
    let operatorEmotion = 'neutral';
    let operatorEmotionTimeout = null;
    let showLightbulb = false;
    let lightbulbTimeout = null;

    // Code change queue
    const codeChanges = [];
    let codeChangeId = 0;

    // Request queue
    const requests = [];
    let requestId = 0;
    let requestsSinceLastError = 0;

    // Request states
    const STATE_INPUT = 'input';
    const STATE_PROCESSING = 'processing';
    const STATE_RESPONSE = 'response';
    const STATE_DONE = 'done';

    // Code change states
    const STATE_CODE_TRAVELING = 'traveling';
    const STATE_CODE_DONE = 'done';

    // Create a new request
    function createRequest() {
      const nums = [
        Math.floor(Math.random() * 9) + 1,
        Math.floor(Math.random() * 9) + 1,
        Math.floor(Math.random() * 9) + 1
      ];
      // Force error if we haven't had one in FORCE_ERROR_EVERY requests
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
        speed: 0.012 + Math.random() * 0.004,
        seed: Math.floor(Math.random() * 10000),
        responseProgress: 0,
        telemetryProgress: 0,
        operatorNotified: false,
      };
    }

    // Create code change
    function createCodeChange() {
      return {
        id: codeChangeId++,
        state: STATE_CODE_TRAVELING,
        progress: 0,
        speed: 0.015,
        seed: Math.floor(Math.random() * 10000),
      };
    }

    // Schedule request creation
    let lastRequestTime = 0;
    const requestInterval = 3500;

    function maybeCreateRequest(time) {
      if (time - lastRequestTime > requestInterval && requests.filter(r => r.state !== STATE_DONE).length < 2) {
        requests.push(createRequest());
        lastRequestTime = time;
      }
    }

    // Get position for input bubble (from user's screen to system)
    function getInputPosition(progress) {
      const startX = userScreenX + 30;
      const endX = systemX - 5;
      return {
        x: startX + (endX - startX) * progress,
        y: centerY
      };
    }

    // Get position for response (separate line from system, going down then back)
    function getResponsePosition(progress) {
      const startX = systemRight;
      const startY = responseStartY;
      const endX = userReturnX;
      const bottomY = centerY + 50;
      
      if (progress < 0.15) {
        const p = progress / 0.15;
        return { x: startX + 25 * p, y: startY };
      } else if (progress < 0.35) {
        const p = (progress - 0.15) / 0.2;
        return { x: startX + 25, y: startY + (bottomY - startY) * p };
      } else if (progress < 0.8) {
        const p = (progress - 0.35) / 0.45;
        return { x: startX + 25 - (startX + 25 - endX) * p, y: bottomY };
      } else {
        const p = (progress - 0.8) / 0.2;
        return { x: endX, y: bottomY - (bottomY - centerY) * p };
      }
    }

    // Get position for telemetry (straight line from system to observability backend)
    function getTelemetryPosition(progress) {
      const startX = systemRight;
      const startY = telemetryStartY;
      const endX = observabilityX - 28;
      const endY = observabilityY;
      
      return {
        x: startX + (endX - startX) * progress,
        y: startY + (endY - startY) * progress
      };
    }

    // Get position for code change (from operator to system, going up then left then down)
    function getCodeChangePosition(progress) {
      const startX = operatorX;
      const startY = operatorY - 35;
      const endX = systemX + systemWidth / 2;
      const endY = centerY - systemHeight / 2 - 5;
      const topY = Math.min(startY, endY) - 30;
      
      if (progress < 0.2) {
        const p = progress / 0.2;
        return { x: startX, y: startY - (startY - topY) * p };
      } else if (progress < 0.75) {
        const p = (progress - 0.2) / 0.55;
        return { x: startX - (startX - endX) * p, y: topY };
      } else {
        const p = (progress - 0.75) / 0.25;
        return { x: endX, y: topY + (endY - topY) * p };
      }
    }

    // Draw static elements
    function drawStaticElements() {
      staticCtx.fillStyle = colors.background;
      staticCtx.fillRect(0, 0, width, height);

      // Draw User's Screen/Computer (Browser)
      const userScreenW = 45;
      const userScreenH = 38;
      
      staticRc.rectangle(userScreenX - userScreenW/2, userScreenY - userScreenH/2, userScreenW, userScreenH, {
        fill: colors.user,
        fillStyle: 'solid',
        stroke: colors.user,
        ...roughOptions,
        roughness: 2,
        seed: SEEDS.userScreen,
      });
      
      // Browser chrome - address bar
      staticCtx.fillStyle = '#fff';
      staticCtx.fillRect(userScreenX - userScreenW/2 + 4, userScreenY - userScreenH/2 + 4, userScreenW - 8, 10);
      
      // Browser dots (traffic lights)
      const dotY = userScreenY - userScreenH/2 + 9;
      staticCtx.fillStyle = '#ef4444';
      staticCtx.beginPath();
      staticCtx.arc(userScreenX - userScreenW/2 + 8, dotY, 2, 0, Math.PI * 2);
      staticCtx.fill();
      staticCtx.fillStyle = '#eab308';
      staticCtx.beginPath();
      staticCtx.arc(userScreenX - userScreenW/2 + 14, dotY, 2, 0, Math.PI * 2);
      staticCtx.fill();
      staticCtx.fillStyle = '#22c55e';
      staticCtx.beginPath();
      staticCtx.arc(userScreenX - userScreenW/2 + 20, dotY, 2, 0, Math.PI * 2);
      staticCtx.fill();
      
      // Browser content area
      staticCtx.fillStyle = '#e0e0e0';
      staticCtx.fillRect(userScreenX - userScreenW/2 + 4, userScreenY - userScreenH/2 + 16, userScreenW - 8, userScreenH - 22);
      
      // Simple content lines
      staticCtx.fillStyle = '#999';
      staticCtx.fillRect(userScreenX - 12, userScreenY + 2, 24, 2);
      staticCtx.fillRect(userScreenX - 10, userScreenY + 7, 20, 2);
      
      // Monitor stand
      staticCtx.fillStyle = colors.user;
      staticCtx.fillRect(userScreenX - 6, userScreenY + userScreenH/2, 12, 6);
      staticCtx.fillRect(userScreenX - 12, userScreenY + userScreenH/2 + 4, 24, 3);

      // Input path (from user's screen to system)
      staticRc.linearPath([
        [userScreenX + 30, centerY],
        [systemX - 5, centerY]
      ], {
        stroke: colors.input,
        strokeWidth: 1.5,
        roughness: 1,
        strokeLineDash: [5, 5],
        seed: SEEDS.inputPath,
      });

      // Response path (from system bottom-right, down and back to user)
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

      // Telemetry path (straight line from system to observability backend)
      staticRc.line(systemRight, telemetryStartY, observabilityX - 28, observabilityY, {
        stroke: colors.telemetry,
        strokeWidth: 1.5,
        roughness: 0.8,
        strokeLineDash: [5, 5],
        seed: SEEDS.telemetryPath,
      });

      // Code change path (from operator to system)
      const codeChangePoints = [];
      for (let t = 0; t <= 1; t += 0.03) {
        const pos = getCodeChangePosition(t);
        codeChangePoints.push([pos.x, pos.y]);
      }
      staticRc.linearPath(codeChangePoints, {
        stroke: colors.codeChange,
        strokeWidth: 1.5,
        roughness: 0.8,
        strokeLineDash: [5, 5],
        seed: SEEDS.codeChangePath,
      });

      // Draw System as a server rack
      const serverX = systemX;
      const serverY = centerY - systemHeight/2;
      const serverW = systemWidth;
      const serverH = systemHeight;
      
      // Main server body
      staticRc.rectangle(serverX, serverY, serverW, serverH, {
        fill: colors.system,
        fillStyle: 'solid',
        stroke: colors.system,
        ...roughOptions,
        roughness: 2,
        seed: SEEDS.system,
      });
      
      // Server rack lines (horizontal dividers)
      const lineY1 = serverY + serverH * 0.3;
      const lineY2 = serverY + serverH * 0.6;
      staticRc.line(serverX + 4, lineY1, serverX + serverW - 4, lineY1, {
        stroke: '#fff',
        strokeWidth: 1,
        roughness: 1,
        seed: SEEDS.system + 10,
      });
      staticRc.line(serverX + 4, lineY2, serverX + serverW - 4, lineY2, {
        stroke: '#fff',
        strokeWidth: 1,
        roughness: 1,
        seed: SEEDS.system + 11,
      });
      
      // LED lights on server
      const ledX = serverX + 8;
      staticRc.circle(ledX, serverY + serverH * 0.15, 5, {
        fill: '#4ade80',
        fillStyle: 'solid',
        stroke: '#4ade80',
        roughness: 0.5,
        seed: SEEDS.system + 20,
      });
      staticRc.circle(ledX, serverY + serverH * 0.45, 5, {
        fill: '#4ade80',
        fillStyle: 'solid',
        stroke: '#4ade80',
        roughness: 0.5,
        seed: SEEDS.system + 21,
      });
      staticRc.circle(ledX, serverY + serverH * 0.75, 5, {
        fill: '#facc15',
        fillStyle: 'solid',
        stroke: '#facc15',
        roughness: 0.5,
        seed: SEEDS.system + 22,
      });
      
      // Vents on the right side
      for (let i = 0; i < 3; i++) {
        const ventY = serverY + 8 + i * (serverH * 0.3);
        staticRc.line(serverX + serverW - 18, ventY, serverX + serverW - 6, ventY, {
          stroke: '#fff',
          strokeWidth: 1,
          roughness: 0.5,
          seed: SEEDS.system + 30 + i,
        });
        staticRc.line(serverX + serverW - 18, ventY + 4, serverX + serverW - 6, ventY + 4, {
          stroke: '#fff',
          strokeWidth: 1,
          roughness: 0.5,
          seed: SEEDS.system + 33 + i,
        });
      }
      
      // Label below
      staticCtx.fillStyle = colors.text;
      staticCtx.font = 'italic 10px "Comic Sans MS", cursive, sans-serif';
      staticCtx.textAlign = 'center';
      staticCtx.fillText('System', systemX + systemWidth/2, centerY + systemHeight/2 + 14);

      // Draw Observability Backend (like a monitor/screen)
      const obsW = 55;
      const obsH = 45;
      
      staticRc.rectangle(observabilityX - obsW/2, observabilityY - obsH/2, obsW, obsH, {
        fill: colors.observability,
        fillStyle: 'solid',
        stroke: colors.observability,
        ...roughOptions,
        roughness: 2,
        seed: SEEDS.observability,
      });
      
      // Chart icon
      staticRc.linearPath([
        [observabilityX - 14, observabilityY + 6],
        [observabilityX - 5, observabilityY - 4],
        [observabilityX + 5, observabilityY + 2],
        [observabilityX + 14, observabilityY - 8]
      ], {
        stroke: '#fff',
        strokeWidth: 2,
        roughness: 1,
        seed: SEEDS.chart,
      });
      
      // Monitor stand
      staticCtx.fillStyle = colors.observability;
      staticCtx.fillRect(observabilityX - 8, observabilityY + obsH/2, 16, 8);
      staticCtx.fillRect(observabilityX - 15, observabilityY + obsH/2 + 6, 30, 4);
      
      staticCtx.fillStyle = colors.text;
      staticCtx.font = 'italic 8px "Comic Sans MS", cursive, sans-serif';
      staticCtx.textAlign = 'center';
      staticCtx.fillText('Observability', observabilityX, observabilityY + obsH/2 + 22);
      staticCtx.fillText('Backend', observabilityX, observabilityY + obsH/2 + 32);

      // Draw Legend - Inputs first, then Outputs
      const legendY = height - 18;
      const items = [
        { color: colors.input, label: 'Input (Request)' },
        { color: colors.codeChange, label: 'Input (Config Change)' },
        { color: colors.output, label: 'Output (non-telemetry)' },
        { color: colors.telemetry, label: 'Output (telemetry)' },
      ];
      
      staticCtx.font = 'italic 8px "Comic Sans MS", cursive, sans-serif';
      const totalWidth = items.reduce((acc, item) => acc + staticCtx.measureText(item.label).width + 22, 0);
      let legendX = (width - totalWidth) / 2;
      
      items.forEach((item, i) => {
        staticRc.circle(legendX + 5, legendY, 8, {
          fill: item.color,
          fillStyle: 'solid',
          stroke: item.color,
          roughness: 0.8,
          seed: SEEDS.legendInput + i,
        });
        
        staticCtx.fillStyle = colors.text;
        staticCtx.textAlign = 'left';
        staticCtx.fillText(item.label, legendX + 11, legendY + 3);
        
        legendX += staticCtx.measureText(item.label).width + 22;
      });
    }

    // Draw user with emotion (sitting beside their screen)
    function drawUser(emotion) {
      const userDrawX = userX; // User sits to the left of their screen
      const userDrawY = centerY + 5;
      
      // Dark cloud with thunder when sad
      if (emotion === 'sad') {
        const cloudX = userDrawX;
        const cloudY = userDrawY - 38;
        
        // Dark cloud
        ctx.fillStyle = '#555';
        ctx.beginPath();
        ctx.arc(cloudX - 8, cloudY, 8, 0, Math.PI * 2);
        ctx.arc(cloudX + 6, cloudY - 2, 9, 0, Math.PI * 2);
        ctx.arc(cloudX + 0, cloudY - 6, 7, 0, Math.PI * 2);
        ctx.arc(cloudX - 10, cloudY - 4, 6, 0, Math.PI * 2);
        ctx.fill();
        
        // Lightning bolt
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
      
      // Head
      rc.circle(userDrawX, userDrawY - 8, 22, {
        fill: colors.user,
        fillStyle: 'solid',
        stroke: colors.user,
        ...roughOptions,
        seed: SEEDS.userHead,
      });
      
      // Face background
      ctx.fillStyle = colors.face;
      ctx.beginPath();
      ctx.arc(userDrawX, userDrawY - 8, 8, 0, Math.PI * 2);
      ctx.fill();
      
      // Eyes
      ctx.fillStyle = colors.text;
      ctx.beginPath();
      ctx.arc(userDrawX - 3, userDrawY - 11, 1.5, 0, Math.PI * 2);
      ctx.arc(userDrawX + 3, userDrawY - 11, 1.5, 0, Math.PI * 2);
      ctx.fill();
      
      // Mouth based on emotion
      ctx.strokeStyle = colors.text;
      ctx.lineWidth = 1.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      
      if (emotion === 'happy') {
        ctx.arc(userDrawX, userDrawY - 5, 3.5, 0.2, Math.PI - 0.2);
      } else if (emotion === 'sad') {
        ctx.arc(userDrawX, userDrawY - 1, 3.5, Math.PI + 0.3, -0.3);
      } else {
        ctx.moveTo(userDrawX - 3, userDrawY - 4);
        ctx.lineTo(userDrawX + 3, userDrawY - 4);
      }
      ctx.stroke();
      
      // Body
      rc.rectangle(userDrawX - 14, userDrawY + 8, 28, 28, {
        fill: colors.user,
        fillStyle: 'solid',
        stroke: colors.user,
        roughness: 1.2,
        seed: SEEDS.userBody,
      });

      // Arms - one reaching toward screen
      rc.line(userDrawX + 14, userDrawY + 12, userDrawX + 28, userDrawY + 5, {
        stroke: colors.user,
        strokeWidth: 5,
        roughness: 1,
        seed: SEEDS.userBody + 1,
      });
      rc.line(userDrawX - 14, userDrawY + 12, userDrawX - 23, userDrawY + 26, {
        stroke: colors.user,
        strokeWidth: 5,
        roughness: 1,
        seed: SEEDS.userBody + 2,
      });

      // Label
      ctx.fillStyle = colors.text;
      ctx.font = 'italic 10px "Comic Sans MS", cursive, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('User', userDrawX, userDrawY + 52);
    }

    // Draw operator sitting beside the backend (looking at the screen)
    function drawOperator(emotion, showBulb) {
      // Head
      rc.circle(operatorX, operatorY - 8, 22, {
        fill: colors.operator,
        fillStyle: 'solid',
        stroke: colors.operator,
        ...roughOptions,
        seed: SEEDS.operatorHead,
      });
      
      // Face background
      ctx.fillStyle = colors.face;
      ctx.beginPath();
      ctx.arc(operatorX, operatorY - 8, 8, 0, Math.PI * 2);
      ctx.fill();
      
      // Eyes
      ctx.fillStyle = colors.text;
      ctx.beginPath();
      ctx.arc(operatorX - 3, operatorY - 11, 1.5, 0, Math.PI * 2);
      ctx.arc(operatorX + 3, operatorY - 11, 1.5, 0, Math.PI * 2);
      ctx.fill();
      
      // Mouth based on emotion
      ctx.strokeStyle = colors.text;
      ctx.lineWidth = 1.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      
      if (emotion === 'happy') {
        ctx.arc(operatorX, operatorY - 5, 3.5, 0.2, Math.PI - 0.2);
      } else {
        // Neutral :-|
        ctx.moveTo(operatorX - 3, operatorY - 4);
        ctx.lineTo(operatorX + 3, operatorY - 4);
      }
      ctx.stroke();
      
      // Body
      rc.rectangle(operatorX - 14, operatorY + 8, 28, 28, {
        fill: colors.operator,
        fillStyle: 'solid',
        stroke: colors.operator,
        roughness: 1.2,
        seed: SEEDS.operatorBody,
      });

      // Arms - one reaching toward screen
      rc.line(operatorX - 14, operatorY + 12, operatorX - 28, operatorY + 5, {
        stroke: colors.operator,
        strokeWidth: 5,
        roughness: 1,
        seed: SEEDS.operatorBody + 1,
      });
      rc.line(operatorX + 14, operatorY + 12, operatorX + 23, operatorY + 26, {
        stroke: colors.operator,
        strokeWidth: 5,
        roughness: 1,
        seed: SEEDS.operatorBody + 2,
      });

      // Lightbulb if needed (above head)
      if (showBulb) {
        const bulbX = operatorX;
        const bulbY = operatorY - 38;
        
        // Bulb glow
        ctx.fillStyle = colors.lightbulb + '40';
        ctx.beginPath();
        ctx.arc(bulbX, bulbY, 14, 0, Math.PI * 2);
        ctx.fill();
        
        // Bulb
        rc.circle(bulbX, bulbY, 16, {
          fill: colors.lightbulb,
          fillStyle: 'solid',
          stroke: colors.lightbulb,
          roughness: 0.8,
          seed: 9999,
        });
        
        // Bulb base
        ctx.fillStyle = '#666';
        ctx.fillRect(bulbX - 4, bulbY + 6, 8, 5);
        
        // Rays
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

      // Label
      ctx.fillStyle = colors.text;
      ctx.font = 'italic 10px "Comic Sans MS", cursive, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Operator', operatorX, operatorY + 52);
    }

    // Draw input bubble with 3 numbers
    function drawInputBubble(request, pos) {
      const text = request.nums.join(', ');
      
      rc.ellipse(pos.x, pos.y, 45, 24, {
        fill: colors.input,
        fillStyle: 'solid',
        stroke: colors.input,
        roughness: 1,
        seed: request.seed,
      });
      
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, pos.x, pos.y);
    }

    // Draw response bubble (sum)
    function drawResponseBubble(request, pos) {
      const color = request.hasError ? colors.error : colors.output;
      
      rc.ellipse(pos.x, pos.y, 28, 20, {
        fill: color,
        fillStyle: 'solid',
        stroke: color,
        roughness: 1,
        seed: request.seed + 100,
      });
      
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('=' + request.displaySum, pos.x, pos.y);
    }

    // Draw telemetry bubble (delay + error status)
    function drawTelemetryBubble(request, pos) {
      const statusText = request.hasError ? '✗' : '✓';
      const text = request.delay + 'ms ' + statusText;
      
      rc.ellipse(pos.x, pos.y, 48, 20, {
        fill: colors.telemetry,
        fillStyle: 'solid',
        stroke: colors.telemetry,
        roughness: 1,
        seed: request.seed + 200,
      });
      
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 8px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, pos.x, pos.y);
    }

    // Draw code change bubble
    function drawCodeChangeBubble(codeChange, pos) {
      rc.ellipse(pos.x, pos.y, 32, 18, {
        fill: colors.codeChange,
        fillStyle: 'solid',
        stroke: colors.codeChange,
        roughness: 1,
        seed: codeChange.seed,
      });
      
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 8px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('fix', pos.x, pos.y);
    }

    // Draw processing indicator
    function drawProcessingIndicator() {
      const dots = Math.floor((Date.now() / 200) % 4);
      const text = '.'.repeat(dots);
      
      ctx.fillStyle = colors.text;
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, systemX + systemWidth/2, centerY + 20);
    }

    // Update user emotion when response arrives
    function setUserEmotion(hasError) {
      userEmotion = hasError ? 'sad' : 'happy';
      
      if (userEmotionTimeout) clearTimeout(userEmotionTimeout);
      userEmotionTimeout = setTimeout(function() {
        userEmotion = 'neutral';
      }, 2000);
    }

    // Update operator emotion and trigger code change on error
    function setOperatorReaction(hasError) {
      if (hasError) {
        operatorEmotion = 'neutral';
        showLightbulb = true;
        
        // After lightbulb moment, send code change
        if (lightbulbTimeout) clearTimeout(lightbulbTimeout);
        lightbulbTimeout = setTimeout(function() {
          codeChanges.push(createCodeChange());
          showLightbulb = false;
        }, 1200);
        
        if (operatorEmotionTimeout) clearTimeout(operatorEmotionTimeout);
        operatorEmotionTimeout = setTimeout(function() {
          operatorEmotion = 'neutral';
        }, 3000);
      } else {
        operatorEmotion = 'happy';
        
        if (operatorEmotionTimeout) clearTimeout(operatorEmotionTimeout);
        operatorEmotionTimeout = setTimeout(function() {
          operatorEmotion = 'neutral';
        }, 2000);
      }
    }

    // Update and draw a request
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
            request.telemetryProgress = 0;
          } else {
            drawProcessingIndicator();
          }
          break;

        case STATE_RESPONSE:
          request.responseProgress += request.speed * 0.9;
          request.telemetryProgress += request.speed * 1.1;
          
          // Check if response just arrived at user
          if (request.responseProgress >= 1 && !request.emotionSet) {
            setUserEmotion(request.hasError);
            request.emotionSet = true;
          }
          
          // Check if telemetry just arrived at backend (operator sees it)
          if (request.telemetryProgress >= 1 && !request.operatorNotified) {
            setOperatorReaction(request.hasError);
            request.operatorNotified = true;
          }
          
          if (request.responseProgress < 1) {
            const pos = getResponsePosition(request.responseProgress);
            drawResponseBubble(request, pos);
          }
          
          if (request.telemetryProgress < 1) {
            const pos = getTelemetryPosition(request.telemetryProgress);
            drawTelemetryBubble(request, pos);
          }
          
          if (request.responseProgress >= 1 && request.telemetryProgress >= 1) {
            request.state = STATE_DONE;
          }
          break;
      }
    }

    // Update and draw code change
    function updateCodeChange(codeChange) {
      if (codeChange.state === STATE_CODE_TRAVELING) {
        codeChange.progress += codeChange.speed;
        
        if (codeChange.progress >= 1) {
          codeChange.state = STATE_CODE_DONE;
        } else {
          const pos = getCodeChangePosition(codeChange.progress);
          drawCodeChangeBubble(codeChange, pos);
        }
      }
    }

    // Draw static elements once
    drawStaticElements();

    // Main animation loop
    function draw(time) {
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(staticCanvas, 0, 0);
      
      // Draw user and operator with current emotions
      drawUser(userEmotion);
      drawOperator(operatorEmotion, showLightbulb);
      
      maybeCreateRequest(time);
      
      // Update and draw all active requests
      for (let i = requests.length - 1; i >= 0; i--) {
        const request = requests[i];
        
        if (request.state === STATE_DONE) {
          requests.splice(i, 1);
        } else {
          updateRequest(request, time);
        }
      }
      
      // Update and draw code changes
      for (let i = codeChanges.length - 1; i >= 0; i--) {
        const cc = codeChanges[i];
        
        if (cc.state === STATE_CODE_DONE) {
          codeChanges.splice(i, 1);
        } else {
          updateCodeChange(cc);
        }
      }
      
      requestAnimationFrame(draw);
    }

    // Handle resize
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


