/**
 * Animation Loader
 * Loads and initializes animations based on data attributes on container elements.
 * Each animation is a separate module that exports an init function.
 */
(function() {
  'use strict';

  // Registry of available animations
  const animations = {};
  let initialized = false;

  // Register an animation and initialize if DOM is ready
  window.registerAnimation = function(name, initFn) {
    animations[name] = initFn;
    
    // If DOM is ready, initialize any containers waiting for this animation
    if (initialized) {
      initAnimationsByName(name);
    }
  };

  // Initialize animations by name
  function initAnimationsByName(name) {
    const containers = document.querySelectorAll('[data-animation-name="' + name + '"]');
    
    containers.forEach(function(container) {
      // Skip if already initialized
      if (container.dataset.animationInitialized) {
        return;
      }
      
      const parametersStr = container.dataset.animationParameters || '{}';
      
      let parameters = {};
      try {
        parameters = JSON.parse(parametersStr);
      } catch (e) {
        console.warn('Animation: Failed to parse parameters for', name, e);
      }

      if (animations[name]) {
        try {
          animations[name](container, parameters);
          container.dataset.animationInitialized = 'true';
        } catch (e) {
          console.error('Animation: Failed to initialize', name, e);
        }
      }
    });
  }

  // Initialize all animations on the page
  function initAnimations() {
    initialized = true;
    const containers = document.querySelectorAll('[data-animation-name]');
    
    containers.forEach(function(container) {
      const name = container.dataset.animationName;
      
      if (animations[name]) {
        initAnimationsByName(name);
      }
    });
  }

  // Run when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAnimations);
  } else {
    initAnimations();
  }
})();
