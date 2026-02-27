/**
 * Load Generator Comparison Animation
 * Visualizes: Impact of response time on request rate with sequential load generator
 * Client -> Server, with slider to control server delay
 */
(function() {
  'use strict';

  window.registerAnimation('load-generator-comparison', function(container, params) {
    // Wait for Rough.js to be available
    if (typeof rough === 'undefined') {
      setTimeout(function() {
        window.registerAnimation('load-generator-comparison', arguments.callee);
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
      slider: isDarkMode ? '#ba68c8' : '#9c27b0',
      sliderTrack: isDarkMode ? '#424242' : '#cccccc',
    };

    const roughOptions = { roughness: 1.5, bowing: 2, strokeWidth: 2 };

    // Fixed seeds for consistent rendering
    const SEEDS = {
      client: 3001,
      server: 3002,
      connectionLine: 3003,
      sliderTrack: 3004,
      sliderThumb: 3005,
    };

    // Layout
    const clientX = width * 0.2;
    const serverX = width * 0.75;
    const centerY = height * 0.8;
    const boxSize = 60;
    
    // Connection line endpoints
    const lineStartX = clientX + boxSize/2;
    const lineEndX = serverX - boxSize/2;

    // Slider (vertical, to the right of server)
    const sliderY = height * 0.1;
    const sliderHeight = (centerY + boxSize/2) - sliderY;
    const sliderX = serverX + 90;
    let sliderValue = 0; // 0 = 250ms delay at top, 1 = 4000ms delay at bottom

    // Animation state
    const requests = [];
    let requestId = 0;
    let lastRequestTime = -Infinity;
    let callsPerSecond = 0;
    let avgResponseTime = 100;
    let recentResponseTimes = [];
    let animationStartTime = null;

    // Mouse handling for slider
    let isDragging = false;
    canvas.addEventListener('mousedown', function(e) {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      if (Math.abs(x - sliderX) < 30 && y >= sliderY && y <= sliderY + sliderHeight) {
        isDragging = true;
        updateSlider(y);
      }
    });
    
    canvas.addEventListener('mousemove', function(e) {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      // Check if hovering over slider handle
      if (Math.abs(x - sliderX) < 30 && y >= sliderY && y <= sliderY + sliderHeight) {
        canvas.style.cursor = 'grab';
        if (isDragging) {
          canvas.style.cursor = 'grabbing';
        }
      } else {
        canvas.style.cursor = 'default';
      }
      
      if (isDragging) {
        updateSlider(y);
      }
    });
    
    canvas.addEventListener('mouseup', function() {
      isDragging = false;
      canvas.style.cursor = 'default';
    });
    
    canvas.addEventListener('mouseleave', function() {
      isDragging = false;
      canvas.style.cursor = 'default';
    });

    // Touch support
    canvas.addEventListener('touchstart', function(e) {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const x = e.touches[0].clientX - rect.left;
      const y = e.touches[0].clientY - rect.top;
      
      if (Math.abs(x - sliderX) < 30 && y >= sliderY && y <= sliderY + sliderHeight) {
        isDragging = true;
        updateSlider(y);
      }
    });
    
    canvas.addEventListener('touchmove', function(e) {
      if (isDragging) {
        e.preventDefault();
        const rect = canvas.getBoundingClientRect();
        const y = e.touches[0].clientY - rect.top;
        updateSlider(y);
      }
    });
    
    canvas.addEventListener('touchend', function() {
      isDragging = false;
    });

    function updateSlider(y) {
      sliderValue = Math.max(0, Math.min(1, (sliderY + sliderHeight - y) / sliderHeight));
    }

    function getServerDelay() {
      return 250 + sliderValue * 3750; // 250ms to 4000ms
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
        responseTime: 0,
        travelTime: travelTimeMs,
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
      // Server box
      staticRc.rectangle(serverX - boxSize/2, centerY - boxSize/2, boxSize, boxSize, {
        ...roughOptions,
        fill: colors.server,
        fillStyle: 'solid',
        seed: SEEDS.server,
      });
      
      // Label
      staticCtx.fillStyle = colors.text;
      staticCtx.font = 'bold 14px sans-serif';
      staticCtx.textAlign = 'center';
      staticCtx.fillText('Server', serverX, centerY - boxSize/2 - 15);
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

    function drawSliderTrack() {
      // Vertical track line
      staticRc.line(sliderX, sliderY, sliderX, sliderY + sliderHeight, {
        stroke: colors.sliderTrack,
        strokeWidth: 4,
        roughness: 1,
        seed: SEEDS.sliderTrack,
      });
      
      // Labels
      staticCtx.fillStyle = colors.text;
      staticCtx.font = '11px sans-serif';
      staticCtx.textAlign = 'left';
      staticCtx.fillText('4000ms', sliderX + 25, sliderY + 5);
      staticCtx.fillText('250ms', sliderX + 25, sliderY + sliderHeight + 5);
    }

    function drawMetrics() {
      // Metrics removed per user request
    }

    function drawThroughputDropoff() {
      const maxReqPerMin = 60000 / (travelTimeMs * 2 + 250);  // max at fastest (250ms) delay
      const currentDelay = getServerDelay();
      const currentReqPerMin = 60000 / (travelTimeMs * 2 + currentDelay);
      
      // Match slider height
      const slotSize = 12;
      const slotSpacing = 3;
      const slotCount = Math.floor(sliderHeight / (slotSize + slotSpacing));
      const totalHeight = slotCount * (slotSize + slotSpacing);
      
      // Position: left of client, aligned with slider bottom
      const dropoffX = Math.max(10, clientX - 100);
      const dropoffStartY = sliderY + sliderHeight - totalHeight;
      
      // Calculate how many slots should be "filled" (active)
      const filledSlots = Math.max(0, Math.round((currentReqPerMin / maxReqPerMin) * slotCount));
      
      // Draw slots
      for (let i = 0; i < slotCount; i++) {
        const y = dropoffStartY + i * (slotSize + slotSpacing);
        const isActive = i >= slotCount - filledSlots;
        
        ctx.fillStyle = isActive ? colors.request : (isDarkMode ? '#333333' : '#e0e0e0');
        ctx.fillRect(dropoffX, y, slotSize, slotSize);
        
        // Border
        ctx.strokeStyle = colors.text;
        ctx.lineWidth = 0.5;
        ctx.strokeRect(dropoffX, y, slotSize, slotSize);
      }
      
      // Label above
      ctx.fillStyle = colors.text;
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${currentReqPerMin.toFixed(0)}/min`, dropoffX + slotSize / 2, dropoffStartY - 12);
    }

    function drawSliderThumb() {
      const thumbY = sliderY + (1 - sliderValue) * sliderHeight;
      rc.circle(sliderX, thumbY, 20, {
        ...roughOptions,
        fill: colors.slider,
        fillStyle: 'solid',
        stroke: colors.slider,
        seed: SEEDS.sliderThumb,
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
        }
      });
    }

    function drawServerIndicator(currentTime) {
      // Find if there's a request being processed
      const processingReq = requests.find(r => r.state === 'processing');
      if (!processingReq) return;
      
      // Calculate progress (0 to 1)
      const elapsed = currentTime - processingReq.processingStart;
      const progress = Math.min(1, elapsed / processingReq.processingDelay);
      
      // Draw clock inside server
      const cx = serverX;
      const cy = centerY;
      const radius = 16;
      const clockColor = isDarkMode ? '#ffffff' : '#000000';
      
      // Clock face
      ctx.strokeStyle = clockColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
      ctx.stroke();
      
      // Clock hand (rotates full 360 degrees as progress goes 0 to 1)
      const angle = (progress * 2 * Math.PI) - Math.PI / 2; // Start from top
      const handLength = radius - 3;
      const endX = cx + Math.cos(angle) * handLength;
      const endY = cy + Math.sin(angle) * handLength;
      
      ctx.strokeStyle = clockColor;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(endX, endY);
      ctx.stroke();
      
      // Center dot
      ctx.fillStyle = clockColor;
      ctx.beginPath();
      ctx.arc(cx, cy, 2, 0, 2 * Math.PI);
      ctx.fill();
    }

    function updateRequests(currentTime) {
      // Update existing requests
      for (let i = requests.length - 1; i >= 0; i--) {
        const req = requests[i];
        
        if (req.state === 'traveling') {
          req.x += req.speed;
          
          if (req.x >= req.targetX) {
            req.state = 'processing';
            req.processingStart = currentTime;
            req.processingDelay = getServerDelay();
          }
        } else if (req.state === 'processing') {
          if (currentTime - req.processingStart >= req.processingDelay) {
            req.state = 'returning';
            req.x = lineEndX;
            req.targetX = lineStartX;
            // Store server processing delay as the response time metric
            req.responseTime = req.processingDelay;
            recentResponseTimes.push(req.responseTime);
            if (recentResponseTimes.length > 10) {
              recentResponseTimes.shift();
            }
          }
        } else if (req.state === 'returning') {
          req.x -= req.speed;
          
          if (req.x <= req.targetX) {
            requests.splice(i, 1);
          }
        }
      }
      
      // Calculate metrics
      if (recentResponseTimes.length > 0) {
        avgResponseTime = recentResponseTimes.reduce((a, b) => a + b, 0) / recentResponseTimes.length;
      }
      
      // Calculate calls per second based on current slider value
      // Total time = server processing + round-trip travel time
      const effectiveCallTime = getServerDelay() + (travelTimeMs * 2);
      callsPerSecond = effectiveCallTime > 0 ? 1000 / effectiveCallTime : 0;
      
      // Create new request if previous one is done (sequential)
      const hasActiveRequest = requests.some(r => r.state === 'traveling' || r.state === 'processing' || r.state === 'returning');
      if (!hasActiveRequest && currentTime - lastRequestTime > 50) {
        requests.push(createRequest(currentTime));
        lastRequestTime = currentTime;
      }
    }

    function draw(currentTime) {
      // Initialize animation start time
      if (animationStartTime === null) {
        animationStartTime = currentTime;
      }
      
      // Clear and draw static background
      ctx.fillStyle = colors.background;
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(staticCanvas, 0, 0);
      
      // Update
      updateRequests(currentTime);
      
      // Draw animated elements
      drawRequests();
      drawServerIndicator(currentTime);
      drawSliderThumb();
      drawThroughputDropoff();
      drawMetrics();
      
      // Continue animation
      requestAnimationFrame(draw);
    }

    // Draw static elements once
    staticCtx.fillStyle = colors.background;
    staticCtx.fillRect(0, 0, width, height);
    drawConnectionLine();
    drawClient();
    drawServer();
    drawSliderTrack();

    // Start
    requestAnimationFrame(draw);
  });
})();
