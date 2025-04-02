document.addEventListener('DOMContentLoaded', () => {
    const loaderOverlay = document.getElementById('loader-overlay');
    const playButton = document.getElementById('play-button');
    const video = document.querySelector('video');
    const hiddenContent = document.querySelectorAll('.hidden-content');
    const mainTitle = document.getElementById('main-title');
    const subtitle = document.getElementById('subtitle');
    const rights = document.getElementById('rights');
    
    // Add new animation class for the rights text
    document.head.insertAdjacentHTML('beforeend', `
        <style>
            .fade-in-stagger-3 {
                animation: fadeInUp 1.2s cubic-bezier(0.215, 0.61, 0.355, 1) 0.6s both;
                opacity: 0;
            }
        </style>
    `);
    
    // Simplified loading process to avoid getting stuck
    let videoLoaded = false;
    
    // Force loading completion after a short delay
    // This ensures the loader doesn't hang indefinitely
    setTimeout(() => {
        finishLoading();
    }, 3000); // Show loader for 3 seconds then proceed
    
    // Force loading to complete
    function finishLoading() {
        // Hide loader and show play button with fade-in effect
        loaderOverlay.style.opacity = '0';
        loaderOverlay.style.transition = 'opacity 0.8s cubic-bezier(0.215, 0.61, 0.355, 1)';
        
        setTimeout(() => {
            loaderOverlay.style.display = 'none';
            playButton.style.opacity = '1';
            playButton.style.transition = 'opacity 1.2s cubic-bezier(0.215, 0.61, 0.355, 1)';
            playButton.style.pointerEvents = 'auto';
        }, 800);
    }
    
    // Play button click handler
    playButton.addEventListener('click', () => {
        // Fade out play button with elegant transition
        playButton.style.opacity = '0';
        playButton.style.transform = 'scale(1.2)';
        playButton.style.transition = 'opacity 0.8s ease-out, transform 1.2s ease-out';
        
        // Start playing the video
        video.play().then(() => {
            // Show content with staggered fade-in effect
            setTimeout(() => {
                hiddenContent.forEach(element => {
                    element.classList.add('show-content');
                });
                
                // Add staggered animation classes
                setTimeout(() => {
                    mainTitle.classList.add('fade-in-stagger-1');
                    setTimeout(() => {
                        subtitle.classList.add('fade-in-stagger-2');
                        // Add animation for the rights text with further delay
                        setTimeout(() => {
                            rights.classList.add('fade-in-stagger-3');
                        }, 200);
                    }, 200);
                }, 300);
                
                // Remove play button from DOM after fade out
                setTimeout(() => {
                    playButton.style.display = 'none';
                }, 800);
                
            }, 200);
            
            // Set up audio toggle button
            setupAudioControls();
            
        }).catch(err => {
            console.log('Play attempt failed:', err);
            // Show an error message if playback fails
            playButton.innerHTML = `
                <div class="text-white text-center">
                    <div class="mb-2">⚠️</div>
                    <div>Tap to try again</div>
                </div>
            `;
            playButton.style.opacity = '1';
            playButton.style.transform = 'scale(1)';
        });
    });
    
    // Setup audio controls with elegant animation
    function setupAudioControls() {
        // Set up audio toggle button
        const audioToggle = document.createElement('button');
        audioToggle.className = 'fixed bottom-6 right-6 bg-white/10 backdrop-blur-md p-3 rounded-full z-30 opacity-0 hover:bg-white/20 transition-all duration-300';
        audioToggle.style.transition = 'opacity 1s cubic-bezier(0.215, 0.61, 0.355, 1), transform 0.3s ease';
        audioToggle.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-white"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>';
        document.body.appendChild(audioToggle);
        
        // Add hover effect for better UX
        audioToggle.addEventListener('mouseenter', () => {
            audioToggle.style.transform = 'scale(1.1)';
        });
        
        audioToggle.addEventListener('mouseleave', () => {
            audioToggle.style.transform = 'scale(1)';
        });
        
        setTimeout(() => {
            audioToggle.style.opacity = '1';
            audioToggle.style.transform = 'translateY(0)';
        }, 1500);
        
        // Toggle audio on button click with smooth transition
        audioToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            
            // Add click effect
            audioToggle.style.transform = 'scale(0.9)';
            setTimeout(() => {
                audioToggle.style.transform = 'scale(1)';
            }, 200);
            
            video.muted = !video.muted;
            if (video.muted) {
                audioToggle.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-white"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>';
            } else {
                audioToggle.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-white"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>';
            }
        });
    }
});
