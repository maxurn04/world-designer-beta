/* ==============================================================
   WEB AUDIO SYNTHESIZER ENGINE (0 external files)
   ============================================================== */

        // ==========================================
        // WEB AUDIO SYNTHESIZER ENGINE (0 external files)
        // ==========================================
        let audioCtx = null;
        let masterGainNode = null;
        let masterVolume = 0.4;
        let isAudioMuted = false;

        let ambientOsc1 = null;
        let ambientOsc2 = null;
        let ambientGain = null;
        let rainGain = null;

        function initAudioEngine() {
            if (audioCtx) return;
            try {
                const AudioContextClass = window.AudioContext || window.webkitAudioContext;
                if (!AudioContextClass) return;
                audioCtx = new AudioContextClass();

                masterGainNode = audioCtx.createGain();
                masterGainNode.gain.setValueAtTime(isAudioMuted ? 0 : masterVolume, audioCtx.currentTime);
                masterGainNode.connect(audioCtx.destination);

                startAmbientAudio();
            } catch(e) {
                console.warn('Web Audio error:', e);
            }
        }

        function ensureAudioReady() {
            if (!audioCtx) initAudioEngine();
            if (audioCtx && audioCtx.state === 'suspended') {
                audioCtx.resume();
            }
        }

        function playAudioClick() {
            ensureAudioReady();
            if (!audioCtx || isAudioMuted) return;
            try {
                let osc = audioCtx.createOscillator();
                let gain = audioCtx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(700, audioCtx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(350, audioCtx.currentTime + 0.04);

                gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.04);

                osc.connect(gain);
                gain.connect(masterGainNode);
                osc.start();
                osc.stop(audioCtx.currentTime + 0.045);
            } catch(e) {}
        }

        function playAudioMetroChime() {
            ensureAudioReady();
            if (!audioCtx || isAudioMuted) return;
            try {
                let now = audioCtx.currentTime;
                // Tone 1: E5 (~659Hz)
                let osc1 = audioCtx.createOscillator();
                let gain1 = audioCtx.createGain();
                osc1.type = 'sine';
                osc1.frequency.setValueAtTime(659.25, now);
                gain1.gain.setValueAtTime(0.25, now);
                gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
                osc1.connect(gain1);
                gain1.connect(masterGainNode);
                osc1.start(now);
                osc1.stop(now + 0.17);

                // Tone 2: C5 (~523Hz)
                let osc2 = audioCtx.createOscillator();
                let gain2 = audioCtx.createGain();
                osc2.type = 'sine';
                osc2.frequency.setValueAtTime(523.25, now + 0.17);
                gain2.gain.setValueAtTime(0.28, now + 0.17);
                gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.42);
                osc2.connect(gain2);
                gain2.connect(masterGainNode);
                osc2.start(now + 0.17);
                osc2.stop(now + 0.43);
            } catch(e) {}
        }

        function playAudioBusBell() {
            ensureAudioReady();
            if (!audioCtx || isAudioMuted) return;
            try {
                let now = audioCtx.currentTime;
                let osc = audioCtx.createOscillator();
                let gain = audioCtx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(880, now);
                osc.frequency.exponentialRampToValueAtTime(875, now + 0.25);
                gain.gain.setValueAtTime(0.22, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
                osc.connect(gain);
                gain.connect(masterGainNode);
                osc.start(now);
                osc.stop(now + 0.3);
            } catch(e) {}
        }

        function playMetroBrakeHiss() {
            ensureAudioReady();
            if (!audioCtx || isAudioMuted) return;
            try {
                let bufferSize = Math.floor(audioCtx.sampleRate * 0.38);
                let buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
                let data = buffer.getChannelData(0);
                for (let i = 0; i < bufferSize; i++) {
                    data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (audioCtx.sampleRate * 0.14));
                }
                let noise = audioCtx.createBufferSource();
                noise.buffer = buffer;
                let filter = audioCtx.createBiquadFilter();
                filter.type = 'bandpass';
                filter.frequency.setValueAtTime(1400, audioCtx.currentTime);
                filter.Q.setValueAtTime(1.8, audioCtx.currentTime);
                let gain = audioCtx.createGain();
                gain.gain.setValueAtTime(0.18, audioCtx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.36);
                noise.connect(filter);
                filter.connect(gain);
                gain.connect(masterGainNode);
                noise.start();
            } catch(e) {}
        }

        function playMetroStationArrivalChime() {
            ensureAudioReady();
            if (!audioCtx || isAudioMuted) return;
            try {
                let now = audioCtx.currentTime;
                let tones = [
                    { freq: 698.46, start: 0.0, dur: 0.20 }, // F5
                    { freq: 880.00, start: 0.16, dur: 0.20 }, // A5
                    { freq: 1046.50, start: 0.32, dur: 0.42 } // C6
                ];
                tones.forEach(t => {
                    let osc = audioCtx.createOscillator();
                    let gain = audioCtx.createGain();
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(t.freq, now + t.start);
                    gain.gain.setValueAtTime(0.24, now + t.start);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + t.start + t.dur);
                    osc.connect(gain);
                    gain.connect(masterGainNode);
                    osc.start(now + t.start);
                    osc.stop(now + t.start + t.dur + 0.02);
                });
            } catch(e) {}
        }

        function playMetroDoorCloseAlert() {
            ensureAudioReady();
            if (!audioCtx || isAudioMuted) return;
            try {
                let now = audioCtx.currentTime;
                for (let i = 0; i < 3; i++) {
                    let tStart = now + (i * 0.13);
                    let osc = audioCtx.createOscillator();
                    let gain = audioCtx.createGain();
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(1450, tStart);
                    gain.gain.setValueAtTime(0.20, tStart);
                    gain.gain.exponentialRampToValueAtTime(0.001, tStart + 0.075);
                    osc.connect(gain);
                    gain.connect(masterGainNode);
                    osc.start(tStart);
                    osc.stop(tStart + 0.08);
                }
            } catch(e) {}
        }

        function playAudioNotification() {
            ensureAudioReady();
            if (!audioCtx || isAudioMuted) return;
            try {
                let notes = [523.25, 659.25, 783.99]; // C5, E5, G5
                notes.forEach((freq, i) => {
                    let now = audioCtx.currentTime + (i * 0.08);
                    let osc = audioCtx.createOscillator();
                    let gain = audioCtx.createGain();
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(freq, now);
                    gain.gain.setValueAtTime(0.18, now);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
                    osc.connect(gain);
                    gain.connect(masterGainNode);
                    osc.start(now);
                    osc.stop(now + 0.22);
                });
            } catch(e) {}
        }

        function startAmbientAudio() {
            if (!audioCtx || ambientOsc1) return;
            try {
                ambientGain = audioCtx.createGain();
                ambientGain.gain.setValueAtTime(0.035, audioCtx.currentTime);

                let filter = audioCtx.createBiquadFilter();
                filter.type = 'lowpass';
                filter.frequency.setValueAtTime(140, audioCtx.currentTime);

                ambientOsc1 = audioCtx.createOscillator();
                ambientOsc1.type = 'sine';
                ambientOsc1.frequency.setValueAtTime(55, audioCtx.currentTime);

                ambientOsc2 = audioCtx.createOscillator();
                ambientOsc2.type = 'triangle';
                ambientOsc2.frequency.setValueAtTime(110, audioCtx.currentTime);

                ambientOsc1.connect(filter);
                ambientOsc2.connect(filter);
                filter.connect(ambientGain);
                ambientGain.connect(masterGainNode);

                ambientOsc1.start();
                ambientOsc2.start();

                initRainSoundGenerator();
            } catch(e) {}
        }

        function initRainSoundGenerator() {
            try {
                let bufferSize = audioCtx.sampleRate * 2;
                let buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
                let output = buffer.getChannelData(0);
                for (let i = 0; i < bufferSize; i++) {
                    output[i] = (Math.random() * 2 - 1) * 0.15;
                }

                let whiteNoise = audioCtx.createBufferSource();
                whiteNoise.buffer = buffer;
                whiteNoise.loop = true;

                let rainFilter = audioCtx.createBiquadFilter();
                rainFilter.type = 'bandpass';
                rainFilter.frequency.setValueAtTime(1200, audioCtx.currentTime);
                rainFilter.Q.setValueAtTime(1.2, audioCtx.currentTime);

                rainGain = audioCtx.createGain();
                rainGain.gain.setValueAtTime(0, audioCtx.currentTime);

                whiteNoise.connect(rainFilter);
                rainFilter.connect(rainGain);
                rainGain.connect(masterGainNode);
                whiteNoise.start();
            } catch(e) {}
        }

        function setRainSoundActive(active) {
            if (!audioCtx || !rainGain) return;
            try {
                let target = active && !isAudioMuted ? 0.08 : 0;
                rainGain.gain.linearRampToValueAtTime(target, audioCtx.currentTime + 1.2);
            } catch(e) {}
        }

        function changeMasterVolume(val) {
            ensureAudioReady();
            masterVolume = parseFloat(val) / 100;
            if (masterGainNode && !isAudioMuted) {
                masterGainNode.gain.setValueAtTime(masterVolume, audioCtx.currentTime);
            }
            let slider = document.getElementById('setting-sound-volume');
            if (slider) slider.value = val;
        }

        function toggleMuteAudio() {
            ensureAudioReady();
            playAudioClick();
            isAudioMuted = !isAudioMuted;
            if (masterGainNode) {
                masterGainNode.gain.setValueAtTime(isAudioMuted ? 0 : masterVolume, audioCtx.currentTime);
            }
            let btnNavbar = document.getElementById('btn-sound-toggle');
            let btnSetting = document.getElementById('btn-setting-mute');
            let icon = isAudioMuted ? '🔇' : '🔊';
            if (btnNavbar) btnNavbar.innerText = icon;
            if (btnSetting) btnSetting.innerText = icon;
        }

