/**
 * Parallel Virtual Users Load Generator Animation
 * Extends: Fixed-rate load generator with worker pool and request queueing
 * Adds: Multiple virtual users sending requests in parallel
 */
(function() {
  'use strict';

  window.registerAnimation('parallel-virtual-users-load-generator', function(container, params) {
    if (typeof rough === 'undefined') {
      setTimeout(function() {
        window.registerAnimation('parallel-virtual-users-load-generator', arguments.callee);
      }, 100);
      return;
    }

    const width = container.clientWidth;
    const height = container.clientHeight;

    const staticCanvas = document.createElement('canvas');
    staticCanvas.width = width;
    staticCanvas.height = height;
    const staticCtx = staticCanvas.getContext('2d');
    const staticRc = rough.canvas(staticCanvas);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    container.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    const rc = rough.canvas(canvas);

    const isDarkMode = document.body.classList.contains('dark') || 
                       window.matchMedia('(prefers-color-scheme: dark)').matches;

    const colors = {
      background: isDarkMode ? '#1e1e1e' : '#f5f5f5',
      text: isDarkMode ? '#e0e0e0' : '#333333',
      client: isDarkMode ? '#64b5f6' : '#2196f3',
      server: isDarkMode ? '#81c784' : '#4caf50',
      request: isDarkMode ? '#ffb74d' : '#ff9800',
      response: isDarkMode ? '#4dd0e1' : '#00bcd4',
      rejected: isDarkMode ? '#ef5350' : '#e53935',
      slider: isDarkMode ? '#ba68c8' : '#9c27b0',
      sliderTrack: isDarkMode ? '#424242' : '#cccccc',
    };

    const roughOptions = { roughness: 1.5, bowing: 2, strokeWidth: 2 };

    const SEEDS = {
      client: 4001,
      server: 4002,
      delaySliderTrack: 4004,
      delaySliderThumb: 4005,
      rateSliderTrack: 4006,
      rateSliderThumb: 4007,
      userSliderTrack: 4008,
      userSliderThumb: 4009,
    };

    const clientGroupX = width * 0.35;
    const serverX = width * 0.75;
    const centerY = height * 0.5;
    const clientBoxWidth = 40;
    const clientBoxHeight = 120;
    const serverBoxWidth = 80;
    const serverBoxHeight = 240;
    const LANE_COUNT = 8;
    const VIRTUAL_USERS = 1;
    
    const delaySliderY = height * 0.1;
    const delaySliderHeight = (centerY + serverBoxHeight/2) - delaySliderY;
    const delaySliderX = serverX + 90;
    let delaySliderValue = 0;

    const rateSliderX = clientGroupX - 80;
    const rateSliderY = delaySliderY;
    const rateSliderHeight = delaySliderHeight;
    let rateSliderValue = 0;

    const userSliderX = clientGroupX - 130;
    const userSliderY = delaySliderY;
    const userSliderHeight = delaySliderHeight;
    let userSliderValue = 0;

    const MIN_USERS = 1;
    const MAX_USERS = 8;

    const WORKER_COUNT = 3;
    const MAX_QUEUE_SIZE = 10;
    const workers = [];
    for (let i = 0; i < WORKER_COUNT; i++) {
      workers.push({ busy: false, request: null, startTime: 0 });
    }

    const requests = [];
    let requestId = 0;
    const lastRequestTimePerUser = {};
    let animationStartTime = null;
    let queuedRequests = 0;
    let rejectedRequests = 0;

    let isDraggingDelay = false;
    let isDraggingRate = false;
    let isDraggingUser = false;
    
    canvas.addEventListener('mousedown', function(e) {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      if (Math.abs(x - delaySliderX) < 30 && y >= delaySliderY && y <= delaySliderY + delaySliderHeight) {
        isDraggingDelay = true;
        updateDelaySlider(y);
      } else if (Math.abs(x - rateSliderX) < 30 && y >= rateSliderY && y <= rateSliderY + rateSliderHeight) {
        isDraggingRate = true;
        updateRateSlider(y);
      } else {
        const userThumbY = userSliderY + (1 - userSliderValue) * userSliderHeight;
        if (Math.abs(x - userSliderX) < 25 && Math.abs(y - userThumbY) < 25) {
          isDraggingUser = true;
          updateUserSlider(y);
        }
      }
    });
    
    canvas.addEventListener('mousemove', function(e) {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      const overDelaySlider = Math.abs(x - delaySliderX) < 30 && y >= delaySliderY && y <= delaySliderY + delaySliderHeight;
      const overRateSlider = Math.abs(x - rateSliderX) < 30 && y >= rateSliderY && y <= rateSliderY + rateSliderHeight;
      const overUserSlider = Math.abs(x - userSliderX) < 30 && y >= userSliderY && y <= userSliderY + userSliderHeight;
      
      if (overDelaySlider || overRateSlider || overUserSlider) {
        canvas.style.cursor = (isDraggingDelay || isDraggingRate || isDraggingUser) ? 'grabbing' : 'grab';
      } else {
        canvas.style.cursor = 'default';
      }
      
      if (isDraggingDelay) {
        updateDelaySlider(y);
      } else if (isDraggingRate) {
        updateRateSlider(y);
      } else if (isDraggingUser) {
        updateUserSlider(y);
      }
    });
    
    canvas.addEventListener('mouseup', function() {
      isDraggingDelay = false;
      isDraggingRate = false;
      isDraggingUser = false;
      canvas.style.cursor = 'default';
    });
    
    canvas.addEventListener('mouseleave', function() {
      isDraggingDelay = false;
      isDraggingRate = false;
      isDraggingUser = false;
      canvas.style.cursor = 'default';
    });

    canvas.addEventListener('touchstart', function(e) {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const x = e.touches[0].clientX - rect.left;
      const y = e.touches[0].clientY - rect.top;
      
      if (Math.abs(x - delaySliderX) < 30 && y >= delaySliderY && y <= delaySliderY + delaySliderHeight) {
        isDraggingDelay = true;
        updateDelaySlider(y);
      } else if (Math.abs(x - rateSliderX) < 30 && y >= rateSliderY && y <= rateSliderY + rateSliderHeight) {
        isDraggingRate = true;
        updateRateSlider(y);
      } else {
        const userThumbY = userSliderY + (1 - userSliderValue) * userSliderHeight;
        if (Math.abs(x - userSliderX) < 25 && Math.abs(y - userThumbY) < 25) {
          isDraggingUser = true;
          updateUserSlider(y);
        }
      }
    });
    
    canvas.addEventListener('touchmove', function(e) {
      if (isDraggingDelay || isDraggingRate || isDraggingUser) {
        e.preventDefault();
        const rect = canvas.getBoundingClientRect();
        const x = e.touches[0].clientX - rect.left;
        const y = e.touches[0].clientY - rect.top;
        if (isDraggingDelay) {
          updateDelaySlider(y);
        } else if (isDraggingRate) {
          updateRateSlider(y);
        } else if (isDraggingUser) {
          updateUserSlider(y);
        }
      }
    });
    
    canvas.addEventListener('touchend', function() {
      isDraggingDelay = false;
      isDraggingRate = false;
      isDraggingUser = false;
    });

    function updateDelaySlider(y) {
      delaySliderValue = Math.max(0, Math.min(1, (delaySliderY + delaySliderHeight - y) / delaySliderHeight));
    }

    function updateRateSlider(y) {
      rateSliderValue = Math.max(0, Math.min(1, (rateSliderY + rateSliderHeight - y) / rateSliderHeight));
    }

    function updateUserSlider(y) {
      userSliderValue = Math.max(0, Math.min(1, (userSliderY + userSliderHeight - y) / userSliderHeight));
      // Redraw static elements when user count changes
      staticCtx.fillStyle = colors.background;
      staticCtx.fillRect(0, 0, width, height);
      drawConnectionLines();
      drawClients();
      drawServer();
      drawDelaySliderTrack();
      drawRateSliderTrack();
      drawUserSliderTrack();
    }

    function getUserCount() {
      return Math.floor(MIN_USERS + userSliderValue * (MAX_USERS - MIN_USERS));
    }

    function getServerDelay() {
      return 250 + delaySliderValue * 3750;
    }

    function getRequestRate() {
      return 20 + rateSliderValue * 100;
    }

    const requestSpeed = 4.5;

    function getLineEndpoints(laneId) {
      const clientTop = centerY - clientBoxHeight / 2;
      const serverTop = centerY - serverBoxHeight / 2;
      const laneSpacing = clientBoxHeight / (LANE_COUNT + 1);
      const userY = clientTop + laneSpacing * (laneId + 1);
      const lineStartX = clientGroupX + clientBoxWidth / 2;
      const lineEndX = serverX - serverBoxWidth / 2;
      return { lineStartX, lineEndX, userY };
    }

    function createRequest(laneId, currentTime) {
      const { lineStartX, lineEndX, userY } = getLineEndpoints(laneId);
      return {
        id: requestId++,
        laneId: laneId,
        x: lineStartX,
        y: userY,
        targetX: lineEndX,
        state: 'traveling',
        speed: requestSpeed,
        startTime: currentTime,
        workerId: null,
      };
    }

    function drawClients() {
      staticRc.rectangle(clientGroupX - clientBoxWidth/2, centerY - clientBoxHeight/2, clientBoxWidth, clientBoxHeight, {
        ...roughOptions,
        fill: colors.client,
        fillStyle: 'solid',
        seed: SEEDS.client,
      });
      
      staticCtx.fillStyle = colors.text;
      staticCtx.font = 'bold 12px sans-serif';
      staticCtx.textAlign = 'center';
      staticCtx.fillText('Client', clientGroupX, centerY - clientBoxHeight/2 - 15);
    }

    function drawServer() {
      staticRc.rectangle(serverX - serverBoxWidth/2, centerY - serverBoxHeight/2, serverBoxWidth, serverBoxHeight, {
        ...roughOptions,
        fill: colors.server,
        fillStyle: 'solid',
        seed: SEEDS.server,
      });
      
      staticCtx.fillStyle = colors.text;
      staticCtx.font = 'bold 14px sans-serif';
      staticCtx.textAlign = 'center';
      staticCtx.fillText('Server', serverX, centerY - serverBoxHeight/2 - 15);
    }

    function drawConnectionLines() {
      const userCount = getUserCount();
      for (let i = 0; i < userCount; i++) {
        const { lineStartX, lineEndX, userY } = getLineEndpoints(i);
        staticRc.line(lineStartX, userY, lineEndX, userY, {
          stroke: colors.text,
          strokeWidth: 1,
          roughness: 1,
          seed: SEEDS.server + i + 100,
        });
      }
    }

    function drawDelaySliderTrack() {
      staticRc.line(delaySliderX, delaySliderY, delaySliderX, delaySliderY + delaySliderHeight, {
        stroke: colors.sliderTrack,
        strokeWidth: 4,
        roughness: 1,
        seed: SEEDS.delaySliderTrack,
      });
      
      staticCtx.fillStyle = colors.text;
      staticCtx.font = '11px sans-serif';
      staticCtx.textAlign = 'left';
      staticCtx.fillText('4000ms', delaySliderX + 25, delaySliderY + 5);
      staticCtx.fillText('250ms', delaySliderX + 25, delaySliderY + delaySliderHeight + 5);
    }

    function drawRateSliderTrack() {
      staticRc.line(rateSliderX, rateSliderY, rateSliderX, rateSliderY + rateSliderHeight, {
        stroke: colors.sliderTrack,
        strokeWidth: 4,
        roughness: 1,
        seed: SEEDS.rateSliderTrack,
      });
      
      staticCtx.fillStyle = colors.text;
      staticCtx.font = '11px sans-serif';
      staticCtx.textAlign = 'right';
      staticCtx.fillText('120/min', rateSliderX - 15, rateSliderY + 5);
      staticCtx.fillText('20/min', rateSliderX - 15, rateSliderY + rateSliderHeight + 5);
    }

    function drawUserSliderTrack() {
      staticRc.line(userSliderX, userSliderY, userSliderX, userSliderY + userSliderHeight, {
        stroke: colors.sliderTrack,
        strokeWidth: 4,
        roughness: 1,
        seed: SEEDS.userSliderTrack,
      });
      
      staticCtx.fillStyle = colors.text;
      staticCtx.font = '11px sans-serif';
      staticCtx.textAlign = 'right';
      staticCtx.fillText(`${MAX_USERS}`, userSliderX - 15, userSliderY + 5);
      staticCtx.fillText(`${MIN_USERS}`, userSliderX - 15, userSliderY + userSliderHeight + 5);
      staticCtx.save();
      staticCtx.translate(userSliderX - 35, userSliderY + userSliderHeight / 2);
      staticCtx.rotate(-Math.PI / 2);
      staticCtx.font = 'bold 12px sans-serif';
      staticCtx.textAlign = 'center';
      staticCtx.fillText('Virtual Users', 0, 0);
      staticCtx.restore();
    }

    function drawRateVisualization() {
      const perUserRate = getRequestRate();
      const userCount = getUserCount();
      const totalRate = perUserRate * userCount;
      const slotSize = 12;
      const slotSpacing = 3;
      const slotCount = Math.floor(rateSliderHeight / (slotSize + slotSpacing));
      const totalHeight = slotCount * (slotSize + slotSpacing);
      const vizX = rateSliderX + 25;
      const vizStartY = rateSliderY + rateSliderHeight - totalHeight;
      
      const maxRate = 120 * 8; // Max is 120 per user * 8 users
      const minRate = 20;
      const normalizedRate = Math.max(minRate, totalRate);
      const filledSlots = Math.max(0, Math.min(slotCount, Math.round(((normalizedRate - minRate) / (maxRate - minRate)) * slotCount)));
      
      // Calculate rejected slots based on rejectedRequests
      const rejectedSlots = Math.max(0, Math.min(slotCount, Math.floor((rejectedRequests / (totalRate / 10)) * slotCount)));
      
      for (let i = 0; i < slotCount; i++) {
        const y = vizStartY + i * (slotSize + slotSpacing);
        const isActive = i >= slotCount - filledSlots;
        const isError = i >= slotCount - filledSlots && i < slotCount - filledSlots + rejectedSlots;
        
        if (isError) {
          ctx.fillStyle = colors.rejected;
        } else if (isActive) {
          ctx.fillStyle = colors.request;
        } else {
          ctx.fillStyle = isDarkMode ? '#333333' : '#e0e0e0';
        }
        ctx.fillRect(vizX, y, slotSize, slotSize);
        
        ctx.strokeStyle = colors.text;
        ctx.lineWidth = 0.5;
        ctx.strokeRect(vizX, y, slotSize, slotSize);
      }
      
      ctx.fillStyle = colors.text;
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${totalRate.toFixed(0)}/min`, vizX + slotSize / 2, vizStartY - 12);
    }

    function drawSliderThumbs() {
      const delayThumbY = delaySliderY + (1 - delaySliderValue) * delaySliderHeight;
      rc.circle(delaySliderX, delayThumbY, 20, {
        ...roughOptions,
        fill: colors.slider,
        fillStyle: 'solid',
        stroke: colors.slider,
        seed: SEEDS.delaySliderThumb,
      });

      const rateThumbY = rateSliderY + (1 - rateSliderValue) * rateSliderHeight;
      rc.circle(rateSliderX, rateThumbY, 20, {
        ...roughOptions,
        fill: colors.slider,
        fillStyle: 'solid',
        stroke: colors.slider,
        seed: SEEDS.rateSliderThumb,
      });

      const userThumbY = userSliderY + (1 - userSliderValue) * userSliderHeight;
      rc.circle(userSliderX, userThumbY, 20, {
        ...roughOptions,
        fill: colors.slider,
        fillStyle: 'solid',
        stroke: colors.slider,
        seed: SEEDS.userSliderThumb,
      });
    }

    function drawRequests() {
      requests.forEach(function(req) {
        if (req.state === 'traveling') {
          rc.circle(req.x, req.y, 8, {
            fill: colors.request,
            fillStyle: 'solid',
            stroke: colors.request,
            roughness: 1,
          });
        } else if (req.state === 'returning') {
          rc.circle(req.x, req.y, 8, {
            fill: colors.response,
            fillStyle: 'solid',
            stroke: colors.response,
            roughness: 1,
          });
        } else if (req.state === 'rejected') {
          rc.circle(req.x, req.y, 8, {
            fill: colors.rejected,
            fillStyle: 'solid',
            stroke: colors.rejected,
            roughness: 1,
          });
        }
      });
    }

    function drawWorkerGrid(currentTime) {
      const gridSize = 2;
      const workerSize = 20;
      const gridSpacing = (serverBoxWidth - 10) / gridSize;
      const gridStartX = serverX - serverBoxWidth/2 + 5;
      const gridStartY = centerY - serverBoxHeight/2 + 5;
      const clockColor = isDarkMode ? '#ffffff' : '#000000';
      
      for (let row = 0; row < gridSize; row++) {
        for (let col = 0; col < gridSize; col++) {
          const workerIndex = row * gridSize + col;
          const cx = gridStartX + col * gridSpacing + workerSize/2;
          const cy = gridStartY + row * gridSpacing + workerSize/2;
          
          if (workerIndex === 3) {
            ctx.fillStyle = colors.text;
            ctx.font = 'bold 16px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(`${queuedRequests}`, cx, cy);
            continue;
          }
          
          const worker = workers[workerIndex];
          
          if (worker.busy && worker.request) {
            const elapsed = currentTime - worker.startTime;
            const progress = Math.min(1, elapsed / getServerDelay());
            const radius = 8;
            
            ctx.strokeStyle = clockColor;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
            ctx.stroke();
            
            const angle = (progress * 2 * Math.PI) - Math.PI / 2;
            const handLength = radius - 2;
            const endX = cx + Math.cos(angle) * handLength;
            const endY = cy + Math.sin(angle) * handLength;
            
            ctx.strokeStyle = clockColor;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(endX, endY);
            ctx.stroke();
            
            ctx.fillStyle = clockColor;
            ctx.beginPath();
            ctx.arc(cx, cy, 1.5, 0, 2 * Math.PI);
            ctx.fill();
          } else {
            ctx.fillStyle = isDarkMode ? '#555555' : '#bbbbbb';
            ctx.beginPath();
            ctx.arc(cx, cy, 3, 0, 2 * Math.PI);
            ctx.fill();
          }
        }
      }
    }

    function updateRequests(currentTime) {
      queuedRequests = 0;
      rejectedRequests = 0;
      
      for (let i = requests.length - 1; i >= 0; i--) {
        const req = requests[i];
        const { lineEndX, lineStartX } = getLineEndpoints(req.laneId);
        
        if (req.state === 'traveling') {
          req.x += req.speed;
          
          if (req.x >= lineEndX) {
            const freeWorker = workers.findIndex(w => !w.busy);
            if (freeWorker !== -1) {
              req.state = 'processing';
              req.workerId = freeWorker;
              workers[freeWorker].busy = true;
              workers[freeWorker].request = req;
              workers[freeWorker].startTime = currentTime;
            } else {
              const currentQueueSize = requests.filter(r => r.state === 'queued').length;
              if (currentQueueSize >= MAX_QUEUE_SIZE) {
                req.state = 'rejected';
                req.x = lineEndX;
                req.targetX = lineStartX;
              } else {
                req.state = 'queued';
                queuedRequests++;
              }
            }
          }
        } else if (req.state === 'queued') {
          queuedRequests++;
          const freeWorker = workers.findIndex(w => !w.busy);
          if (freeWorker !== -1) {
            req.state = 'processing';
            req.workerId = freeWorker;
            workers[freeWorker].busy = true;
            workers[freeWorker].request = req;
            workers[freeWorker].startTime = currentTime;
            queuedRequests--;
          }
        } else if (req.state === 'processing') {
          const worker = workers[req.workerId];
          if (currentTime - worker.startTime >= getServerDelay()) {
            req.state = 'returning';
            req.x = lineEndX;
            req.targetX = lineStartX;
            worker.busy = false;
            worker.request = null;
          }
        } else if (req.state === 'returning') {
          req.x -= req.speed;
          
          if (req.x <= lineStartX) {
            requests.splice(i, 1);
          }
        } else if (req.state === 'rejected') {
          req.x -= req.speed;
          rejectedRequests++;
          
          if (req.x <= lineStartX) {
            requests.splice(i, 1);
          }
        }
      }
      
      const rate = getRequestRate();
      const intervalMs = 60000 / rate;
      const userCount = getUserCount();
      
      // Each virtual user sends at the full rate independently
      for (let userId = 0; userId < userCount; userId++) {
        if (!lastRequestTimePerUser[userId]) {
          lastRequestTimePerUser[userId] = currentTime;
        }
        
        if (currentTime - lastRequestTimePerUser[userId] >= intervalMs) {
          requests.push(createRequest(userId, currentTime));
          lastRequestTimePerUser[userId] = currentTime;
        }
      }
      
      // Clean up old user timers
      for (const userId in lastRequestTimePerUser) {
        if (parseInt(userId) >= userCount) {
          delete lastRequestTimePerUser[userId];
        }
      }
    }

    function draw(currentTime) {
      if (animationStartTime === null) {
        animationStartTime = currentTime;
      }
      
      ctx.fillStyle = colors.background;
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(staticCanvas, 0, 0);
      
      updateRequests(currentTime);
      
      drawRequests();
      drawWorkerGrid(currentTime);
      drawSliderThumbs();
      drawRateVisualization();
      
      requestAnimationFrame(draw);
    }

    staticCtx.fillStyle = colors.background;
    staticCtx.fillRect(0, 0, width, height);
    drawConnectionLines();
    drawClients();
    drawServer();
    drawDelaySliderTrack();
    drawRateSliderTrack();
    drawUserSliderTrack();

    requestAnimationFrame(draw);
  });
})();
