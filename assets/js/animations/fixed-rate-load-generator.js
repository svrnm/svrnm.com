/**
 * Fixed Rate Load Generator Animation
 * Visualizes: Fixed-rate load generator with worker pool and request queueing
 * Client -> Server with worker pool, rate slider, and server delay slider
 */
(function() {
  'use strict';

  window.registerAnimation('fixed-rate-load-generator', function(container, params) {
    // Wait for Rough.js to be available
    if (typeof rough === 'undefined') {
      setTimeout(function() {
        window.registerAnimation('fixed-rate-load-generator', arguments.callee);
      }, 100);
      return;
    }

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
      client: isDarkMode ? '#64b5f6' : '#2196f3',
      server: isDarkMode ? '#81c784' : '#4caf50',
      request: isDarkMode ? '#ffb74d' : '#ff9800',
      response: isDarkMode ? '#4dd0e1' : '#00bcd4',
      rejected: isDarkMode ? '#ef5350' : '#e53935',
      slider: isDarkMode ? '#ba68c8' : '#9c27b0',
      sliderTrack: isDarkMode ? '#424242' : '#cccccc',
      worker: isDarkMode ? '#66bb6a' : '#43a047',
      workerBusy: isDarkMode ? '#ef5350' : '#e53935',
    };

    const roughOptions = { roughness: 1.5, bowing: 2, strokeWidth: 2 };

    // Fixed seeds for consistent rendering
    const SEEDS = {
      client: 4001,
      server: 4002,
      connectionLine: 4003,
      delaySliderTrack: 4004,
      delaySliderThumb: 4005,
      rateSliderTrack: 4006,
      rateSliderThumb: 4007,
    };

    // Layout
    const clientX = width * 0.3;
    const serverX = width * 0.75;
    const centerY = height * 0.8;
    const boxSize = 60;
    const serverBoxSize = 80;
    
    // Connection line endpoints
    const lineStartX = clientX + boxSize/2;
    const lineEndX = serverX - serverBoxSize/2;

    // Server delay slider (vertical, to the right of server)
    const delaySliderY = height * 0.1;
    const delaySliderHeight = (centerY + serverBoxSize/2) - delaySliderY;
    const delaySliderX = serverX + 90;
    let delaySliderValue = 0; // 0 = 250ms delay, 1 = 4000ms delay

    // Rate slider (vertical, to the left of client)
    const rateSliderX = clientX - 80;
    const rateSliderY = delaySliderY;
    const rateSliderHeight = delaySliderHeight;
    let rateSliderValue = 0; // 0 = 20 req/min, 1 = 120 req/min

    // Worker pool (3 workers in 2x2 grid, 4th spot shows queue)
    const WORKER_COUNT = 3;
    const MAX_QUEUE_SIZE = 10;
    const workers = [];
    for (let i = 0; i < WORKER_COUNT; i++) {
      workers.push({ busy: false, request: null, startTime: 0 });
    }

    // Animation state
    const requests = [];
    let requestId = 0;
    let lastRequestTime = -Infinity;
    let animationStartTime = null;
    let queuedRequests = 0;
    let rejectedRequests = 0;

    // Mouse handling for sliders
    let isDraggingDelay = false;
    let isDraggingRate = false;
    
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
      }
    });
    
    canvas.addEventListener('mousemove', function(e) {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      // Check if hovering over either slider handle
      const overDelaySlider = Math.abs(x - delaySliderX) < 30 && y >= delaySliderY && y <= delaySliderY + delaySliderHeight;
      const overRateSlider = Math.abs(x - rateSliderX) < 30 && y >= rateSliderY && y <= rateSliderY + rateSliderHeight;
      
      if (overDelaySlider || overRateSlider) {
        canvas.style.cursor = (isDraggingDelay || isDraggingRate) ? 'grabbing' : 'grab';
      } else {
        canvas.style.cursor = 'default';
      }
      
      if (isDraggingDelay) {
        updateDelaySlider(y);
      } else if (isDraggingRate) {
        updateRateSlider(y);
      }
    });
    
    canvas.addEventListener('mouseup', function() {
      isDraggingDelay = false;
      isDraggingRate = false;
      canvas.style.cursor = 'default';
    });
    
    canvas.addEventListener('mouseleave', function() {
      isDraggingDelay = false;
      isDraggingRate = false;
      canvas.style.cursor = 'default';
    });

    // Touch support
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
      }
    });
    
    canvas.addEventListener('touchmove', function(e) {
      if (isDraggingDelay || isDraggingRate) {
        e.preventDefault();
        const rect = canvas.getBoundingClientRect();
        const y = e.touches[0].clientY - rect.top;
        if (isDraggingDelay) {
          updateDelaySlider(y);
        } else if (isDraggingRate) {
          updateRateSlider(y);
        }
      }
    });
    
    canvas.addEventListener('touchend', function() {
      isDraggingDelay = false;
      isDraggingRate = false;
    });

    function updateDelaySlider(y) {
      delaySliderValue = Math.max(0, Math.min(1, (delaySliderY + delaySliderHeight - y) / delaySliderHeight));
    }

    function updateRateSlider(y) {
      rateSliderValue = Math.max(0, Math.min(1, (rateSliderY + rateSliderHeight - y) / rateSliderHeight));
    }

    function getServerDelay() {
      return 250 + delaySliderValue * 3750; // 250ms to 4000ms
    }

    function getRequestRate() {
      // 20 to 120 requests per minute
      return 20 + rateSliderValue * 100;
    }

    // Calculate actual travel time based on distance and speed
    const travelDistance = lineEndX - lineStartX;
    const requestSpeed = 4.5; // pixels per frame
    // Assuming ~60fps, each frame is ~16.67ms
    const travelTimeMs = (travelDistance / requestSpeed) * (1000 / 60);

    function createRequest(currentTime) {
      return {
        id: requestId++,
        x: lineStartX,
        y: centerY,
        targetX: lineEndX,
        state: 'traveling',
        speed: requestSpeed,
        startTime: currentTime,
        workerId: null,
      };
    }

    function drawClient() {
      // Client box
      staticRc.rectangle(clientX - boxSize/2, centerY - boxSize/2, boxSize, boxSize, {
        ...roughOptions,
        fill: colors.client,
        fillStyle: 'solid',
        seed: SEEDS.client,
      });
      
      // Label
      staticCtx.fillStyle = colors.text;
      staticCtx.font = 'bold 14px sans-serif';
      staticCtx.textAlign = 'center';
      staticCtx.fillText('Client', clientX, centerY - boxSize/2 - 15);
    }

    function drawServer() {
      // Server box (larger to accommodate worker grid)
      const serverBoxSize = 80;
      staticRc.rectangle(serverX - serverBoxSize/2, centerY - serverBoxSize/2, serverBoxSize, serverBoxSize, {
        ...roughOptions,
        fill: colors.server,
        fillStyle: 'solid',
        seed: SEEDS.server,
      });
      
      // Label
      staticCtx.fillStyle = colors.text;
      staticCtx.font = 'bold 14px sans-serif';
      staticCtx.textAlign = 'center';
      staticCtx.fillText('Server', serverX, centerY - serverBoxSize/2 - 15);
    }

    function drawConnectionLine() {
      // Line between client and server
      staticRc.line(lineStartX, centerY, lineEndX, centerY, {
        stroke: colors.text,
        strokeWidth: 1,
        roughness: 1,
        seed: SEEDS.connectionLine,
      });
    }

    function drawDelaySliderTrack() {
      // Vertical track line
      staticRc.line(delaySliderX, delaySliderY, delaySliderX, delaySliderY + delaySliderHeight, {
        stroke: colors.sliderTrack,
        strokeWidth: 4,
        roughness: 1,
        seed: SEEDS.delaySliderTrack,
      });
      
      // Labels
      staticCtx.fillStyle = colors.text;
      staticCtx.font = '11px sans-serif';
      staticCtx.textAlign = 'left';
      staticCtx.fillText('4000ms', delaySliderX + 25, delaySliderY + 5);
      staticCtx.fillText('250ms', delaySliderX + 25, delaySliderY + delaySliderHeight + 5);
    }

    function drawRateSliderTrack() {
      // Vertical track line
      staticRc.line(rateSliderX, rateSliderY, rateSliderX, rateSliderY + rateSliderHeight, {
        stroke: colors.sliderTrack,
        strokeWidth: 4,
        roughness: 1,
        seed: SEEDS.rateSliderTrack,
      });
      
      // Labels
      staticCtx.fillStyle = colors.text;
      staticCtx.font = '11px sans-serif';
      staticCtx.textAlign = 'right';
      staticCtx.fillText('120/min', rateSliderX - 15, rateSliderY + 5);
      staticCtx.fillText('20/min', rateSliderX - 15, rateSliderY + rateSliderHeight + 5);
    }

    function drawRateVisualization() {
      const currentRate = getRequestRate();
      
      // Match slider height
      const slotSize = 12;
      const slotSpacing = 3;
      const slotCount = Math.floor(rateSliderHeight / (slotSize + slotSpacing));
      const totalHeight = slotCount * (slotSize + slotSpacing);
      
      // Position: right of rate slider
      const vizX = rateSliderX + 25;
      const vizStartY = rateSliderY + rateSliderHeight - totalHeight;
      
      // Calculate how many slots should be "filled"
      const maxRate = 120;
      const minRate = 20;
      const filledSlots = Math.max(0, Math.round(((currentRate - minRate) / (maxRate - minRate)) * slotCount));
      
      // Calculate rejected requests proportion
      const totalActiveRequests = requests.filter(r => r.state === 'traveling' || r.state === 'returning' || r.state === 'rejected').length;
      const rejectedCount = requests.filter(r => r.state === 'rejected').length;
      const rejectedRatio = totalActiveRequests > 0 ? rejectedCount / totalActiveRequests : 0;
      const rejectedSlots = Math.round(filledSlots * rejectedRatio);
      
      // Draw slots
      for (let i = 0; i < slotCount; i++) {
        const y = vizStartY + i * (slotSize + slotSpacing);
        const slotIndex = slotCount - 1 - i; // Bottom to top index
        const isActive = i >= slotCount - filledSlots;
        const isRejected = isActive && slotIndex < rejectedSlots;
        
        if (isRejected) {
          ctx.fillStyle = colors.rejected;
        } else if (isActive) {
          ctx.fillStyle = colors.request;
        } else {
          ctx.fillStyle = isDarkMode ? '#333333' : '#e0e0e0';
        }
        
        ctx.fillRect(vizX, y, slotSize, slotSize);
        
        // Border
        ctx.strokeStyle = colors.text;
        ctx.lineWidth = 0.5;
        ctx.strokeRect(vizX, y, slotSize, slotSize);
      }
      
      // Label above
      ctx.fillStyle = colors.text;
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${currentRate.toFixed(0)}/min`, vizX + slotSize / 2, vizStartY - 12);
    }

    function drawSliderThumbs() {
      // Delay slider thumb
      const delayThumbY = delaySliderY + (1 - delaySliderValue) * delaySliderHeight;
      rc.circle(delaySliderX, delayThumbY, 20, {
        ...roughOptions,
        fill: colors.slider,
        fillStyle: 'solid',
        stroke: colors.slider,
        seed: SEEDS.delaySliderThumb,
      });

      // Rate slider thumb
      const rateThumbY = rateSliderY + (1 - rateSliderValue) * rateSliderHeight;
      rc.circle(rateSliderX, rateThumbY, 20, {
        ...roughOptions,
        fill: colors.slider,
        fillStyle: 'solid',
        stroke: colors.slider,
        seed: SEEDS.rateSliderThumb,
      });
    }

    function drawRequests() {
      requests.forEach(function(req) {
        if (req.state === 'traveling') {
          // Request going to server
          rc.circle(req.x, req.y, 8, {
            fill: colors.request,
            fillStyle: 'solid',
            stroke: colors.request,
            roughness: 1,
          });
        } else if (req.state === 'returning') {
          // Response returning from server
          rc.circle(req.x, req.y, 8, {
            fill: colors.response,
            fillStyle: 'solid',
            stroke: colors.response,
            roughness: 1,
          });
        } else if (req.state === 'rejected') {
          // Rejected request returning from server
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
      const serverBoxSize = 80;
      const gridSize = 2;
      const workerSize = 20;
      const gridSpacing = (serverBoxSize - 10) / gridSize;
      const gridStartX = serverX - serverBoxSize/2 + 5;
      const gridStartY = centerY - serverBoxSize/2 + 5;
      const clockColor = isDarkMode ? '#ffffff' : '#000000';
      
      for (let row = 0; row < gridSize; row++) {
        for (let col = 0; col < gridSize; col++) {
          const workerIndex = row * gridSize + col;
          const cx = gridStartX + col * gridSpacing + workerSize/2;
          const cy = gridStartY + row * gridSpacing + workerSize/2;
          
          // 4th position (bottom-right) shows queue count
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
            // Worker is busy - draw clock
            const elapsed = currentTime - worker.startTime;
            const progress = Math.min(1, elapsed / getServerDelay());
            const radius = 8;
            
            // Clock face
            ctx.strokeStyle = clockColor;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
            ctx.stroke();
            
            // Clock hand
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
            
            // Center dot
            ctx.fillStyle = clockColor;
            ctx.beginPath();
            ctx.arc(cx, cy, 1.5, 0, 2 * Math.PI);
            ctx.fill();
          } else {
            // Worker is idle - draw small circle
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
      
      // Update existing requests
      for (let i = requests.length - 1; i >= 0; i--) {
        const req = requests[i];
        
        if (req.state === 'traveling') {
          req.x += req.speed;
          
          if (req.x >= req.targetX) {
            // Try to assign to a worker
            const freeWorker = workers.findIndex(w => !w.busy);
            if (freeWorker !== -1) {
              req.state = 'processing';
              req.workerId = freeWorker;
              workers[freeWorker].busy = true;
              workers[freeWorker].request = req;
              workers[freeWorker].startTime = currentTime;
            } else {
              // All workers busy - check queue size
              const currentQueueSize = requests.filter(r => r.state === 'queued').length;
              if (currentQueueSize >= MAX_QUEUE_SIZE) {
                // Queue is full - reject the request
                req.state = 'rejected';
                req.x = lineEndX;
                req.targetX = lineStartX;
                req.rejectedTime = currentTime;
              } else {
                // Queue the request
                req.state = 'queued';
                queuedRequests++;
              }
            }
          }
        } else if (req.state === 'queued') {
          // Still waiting for a worker
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
          
          if (req.x <= req.targetX) {
            requests.splice(i, 1);
          }
        } else if (req.state === 'rejected') {
          req.x -= req.speed;
          rejectedRequests++;
          
          if (req.x <= req.targetX) {
            requests.splice(i, 1);
          }
        }
      }
      
      // Create new requests based on rate
      const rate = getRequestRate();
      const intervalMs = 60000 / rate; // ms between requests
      
      if (currentTime - lastRequestTime >= intervalMs) {
        requests.push(createRequest(currentTime));
        lastRequestTime = currentTime;
      }
    }

    function draw(currentTime) {
      // Initialize animation start time
      if (animationStartTime === null) {
        animationStartTime = currentTime;
        lastRequestTime = currentTime;
      }
      
      // Clear and draw static background
      ctx.fillStyle = colors.background;
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(staticCanvas, 0, 0);
      
      // Update
      updateRequests(currentTime);
      
      // Draw animated elements
      drawRequests();
      drawWorkerGrid(currentTime);
      drawSliderThumbs();
      drawRateVisualization();
      
      // Continue animation
      requestAnimationFrame(draw);
    }

    // Draw static elements once
    staticCtx.fillStyle = colors.background;
    staticCtx.fillRect(0, 0, width, height);
    drawConnectionLine();
    drawClient();
    drawServer();
    drawDelaySliderTrack();
    drawRateSliderTrack();

    // Start
    requestAnimationFrame(draw);
  });
})();
