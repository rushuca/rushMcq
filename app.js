function initApp() {
    const $ = sel => document.querySelector(sel);
    const $$ = sel => Array.from(document.querySelectorAll(sel));

    // --- TRIAL MODE LOGIC ---
    const isTrialMode = sessionStorage.getItem('appMode') === 'trial';
    let quizDataForApp;

    if (isTrialMode) {
        quizDataForApp = Array.isArray(window.quizData) ? window.quizData.map(chapter => ({
            ...chapter,
            items: chapter.items.slice(0, 3)
        })) : [];
        
        const unlockBtn = $('#unlockFromTrialBtn');
        if(unlockBtn) unlockBtn.style.display = 'block';
        $('#chapters-title').textContent = "Chapters (Trial Mode)";
    } else {
        quizDataForApp = window.quizData;
    }
    // --- END TRIAL MODE LOGIC ---

    const splash = document.getElementById('splash-screen');
    if (splash) {
        setTimeout(() => splash.classList.add('splash-hide'), 4000);
        splash.addEventListener('click', () => splash.classList.add('splash-hide'));
    }

    const state = {
        chapters: Array.isArray(quizDataForApp) ? quizDataForApp : [],
        currentChapterIndex: null,
        currentQIndex: 0,
        answers: {},
    };
    
    const STORAGE = sessionStorage;
    const STORAGE_KEY = isTrialMode ? 'rush_mcq_trial_state_v1' : 'rush_mcq_state_v1';

    function loadState() {
        try {
            const raw = STORAGE.getItem(STORAGE_KEY);
            if (!raw) return;
            const saved = JSON.parse(raw);
            if (saved && typeof saved === 'object') {
                state.answers = saved.answers || {};
                state.resume = saved.resume || null;
            }
        } catch (e) {}
    }

    function saveState() {
        const payload = {
            answers: state.answers,
            resume: {
                chapter: state.currentChapterIndex,
                qIndex: state.currentQIndex
            }
        };
        STORAGE.setItem(STORAGE_KEY, JSON.stringify(payload));
    }

    function clearState() {
        STORAGE.removeItem(STORAGE_KEY);
        state.answers = {};
        renderChapters();
        showView('chapters');
    }

    function fmtProgress(chIdx) {
        const items = state.chapters[chIdx].items;
        const ans = state.answers[chIdx] || {};
        let answered = 0, correct = 0, wrong = 0;
        items.forEach((it, i) => {
            if (ans.hasOwnProperty(i)) {
                answered++;
                if (ans[i] === it.answerIndex) correct++;
                else wrong++;
            }
        });
        return { answered, total: items.length, correct, wrong };
    }

    function renderChapters() {
        const list = $('#chaptersList');
        if (!list) return;
        list.innerHTML = '';
        state.chapters.forEach((ch, idx) => {
            const pr = fmtProgress(idx);
            const card = document.createElement('div');
            card.className = 'card';
            
            const fullTotal = window.quizData[idx].items.length; 
            const trialInfoHtml = isTrialMode ? `<p class="trial-info">Full version: ${fullTotal} questions</p>` : '';

            card.innerHTML = `
                <h3>${escapeHtml(ch.chapter || ('Chapter '+(idx+1)))}</h3>
                <p>${pr.answered}/${pr.total} answered • ✅ ${pr.correct} • ❌ ${pr.wrong}</p>
                ${trialInfoHtml}
                <button class="btn primary" data-open="${idx}">Open</button>
            `;
            list.appendChild(card);
        });
    }

    function onChapterOpen(e) {
        const btn = e.target.closest('[data-open]');
        if (!btn) return;
        const idx = parseInt(btn.getAttribute('data-open'), 10);
        openChapter(idx, true);
    }

    function openChapter(idx, askResume) {
        state.currentChapterIndex = idx;
        const resumeInfo = (STORAGE.getItem(STORAGE_KEY) ? JSON.parse(STORAGE.getItem(STORAGE_KEY)).resume : null);
        let startIndex = 0;
        if (askResume && resumeInfo && resumeInfo.chapter === idx && Number.isInteger(resumeInfo.qIndex)) {
            if (confirm('Resume where you left off in this chapter?')) {
                startIndex = Math.min(resumeInfo.qIndex, state.chapters[idx].items.length - 1);
            }
        }
        state.currentQIndex = startIndex;
        showView('quiz');
        renderQuiz();
    }

    function renderQuiz() {
        const chIdx = state.currentChapterIndex;
        const ch = state.chapters[chIdx];
        const qIdx = state.currentQIndex;
        const item = ch.items[qIdx];
        
        $('#chapterTitle').textContent = ch.chapter || ('Chapter '+(chIdx+1));
        
        const pr = fmtProgress(chIdx);
        $('#chapterProgress').innerHTML = `${pr.answered}/${pr.total} answered • ✅ ${pr.correct} • ❌ ${pr.wrong}`;
        
        const fullCountInfoEl = $('#fullCountInfo');
        if (isTrialMode && fullCountInfoEl) {
            const fullTotal = window.quizData[chIdx].items.length;
            fullCountInfoEl.textContent = `(Full version has ${fullTotal} questions)`;
            fullCountInfoEl.style.display = 'inline';
        } else if (fullCountInfoEl) {
            fullCountInfoEl.style.display = 'none';
        }

        const progressPercent = ((qIdx) / ch.items.length) * 100;
        $('#quizProgressBar').style.width = `${progressPercent}%`;

        $('#qIndex').textContent = (qIdx + 1);
        $('#qTotal').textContent = ch.items.length;

        $('#questionText').innerHTML = escapeHtml(item.question || '');

        const list = $('#optionsList');
        list.innerHTML = '';
        const selected = (state.answers[chIdx] || {})[qIdx];

        item.options.forEach((opt, i) => {
            const li = document.createElement('li');
            li.className = 'option';
            li.innerHTML = `<button class="option-btn" data-i="${i}">${escapeHtml(opt)}</button>`;
            list.appendChild(li);
        });

        $('#explanation').classList.add('hidden');

        list.onclick = (e) => {
            const btn = e.target.closest('.option-btn');
            if (!btn) return;
            const i = parseInt(btn.getAttribute('data-i'), 10);
            selectAnswer(i);
        };
        
        const answerBtn = $('#answerBtn');
        answerBtn.disabled = false;
        answerBtn.onclick = () => {
            showAnswerFeedback(null, item.answerIndex, true);
        };

        if (selected !== undefined) {
            showAnswerFeedback(selected, item.answerIndex);
        }

        $('#prevBtn').disabled = qIdx === 0;
        $('#nextBtn').textContent = qIdx === ch.items.length - 1 ? 'Finish' : 'Next';

        $('#correctCount').textContent = pr.correct;
        $('#wrongCount').textContent = pr.wrong;
    }

    function selectAnswer(i) {
        const chIdx = state.currentChapterIndex;
        const qIdx = state.currentQIndex;

        if ((state.answers[chIdx] || {})[qIdx] !== undefined) return;

        state.answers[chIdx] = state.answers[chIdx] || {};
        state.answers[chIdx][qIdx] = i;

        saveState();

        const item = state.chapters[chIdx].items[qIdx];
        showAnswerFeedback(i, item.answerIndex);

        const pr = fmtProgress(chIdx);
        $('#chapterProgress').innerHTML = `${pr.answered}/${pr.total} answered • ✅ ${pr.correct} • ❌ ${pr.wrong}`;
        $('#correctCount').textContent = pr.correct;
        $('#wrongCount').textContent = pr.wrong;
    }

    function showAnswerFeedback(selectedIndex, correctIndex, isAnswerReveal = false) {
        const optionButtons = $$('.option-btn');
        optionButtons.forEach((btn, idx) => {
            btn.disabled = true;
            if (isAnswerReveal) {
                if (idx === correctIndex) {
                    btn.classList.add('answer-reveal');
                }
            } else {
                if (idx === selectedIndex) {
                    btn.classList.add('selected', selectedIndex === correctIndex ? 'correct' : 'wrong');
                }
                if (idx === correctIndex) {
                    btn.classList.add('correct');
                }
            }
        });
        $('#answerBtn').disabled = true;
        $('#optionsList').onclick = null;
        $('#explanation').textContent = state.chapters[state.currentChapterIndex].items[state.currentQIndex].explanation || '';
        $('#explanation').classList.remove('hidden');
    }

    function next() {
        const ch = state.chapters[state.currentChapterIndex];
        if (state.currentQIndex < ch.items.length - 1) {
            state.currentQIndex++;
            saveState();
            renderQuiz();
        } else {
            showEndScreen();
        }
    }

    function prev() {
        if (state.currentQIndex > 0) {
            state.currentQIndex--;
            saveState();
            renderQuiz();
        }
    }

    function showEndScreen() {
        const chIdx = state.currentChapterIndex;
        const pr = fmtProgress(chIdx);
        const pct = Math.round((pr.correct / Math.max(1, pr.total)) * 100);
        $('#endScreen').classList.remove('hidden');
        $('#quizContainer').classList.add('hidden');
        $('#chapterScore').textContent = `${pr.correct}/${pr.total} (${pct}%)`;
    }

    function hideEndScreen() {
        $('#endScreen').classList.add('hidden');
        $('#quizContainer').classList.remove('hidden');
    }

    function renderReview() {
        const chIdx = state.currentChapterIndex;
        const ch = state.chapters[chIdx];
        const userAnswers = state.answers[chIdx] || {};

        $('#reviewChapterTitle').textContent = `Review: ${ch.chapter}`;
        const container = $('#reviewContainer');
        container.innerHTML = '';

        ch.items.forEach((item, qIdx) => {
            const userAnswerIndex = userAnswers[qIdx];
            let optionsHtml = '';
            item.options.forEach((opt, optIdx) => {
                let class_ = 'review-option';
                if (optIdx === item.answerIndex) {
                    class_ += ' correct';
                } else if (optIdx === userAnswerIndex) {
                    class_ += ' user-wrong';
                }
                optionsHtml += `<li class="${class_}">${escapeHtml(opt)}</li>`;
            });
            const reviewItem = document.createElement('div');
            reviewItem.className = 'review-item';
            reviewItem.innerHTML = `
                <div class="review-question">${qIdx + 1}. ${escapeHtml(item.question)}</div>
                <ul class="review-options">${optionsHtml}</ul>
                <div class="review-explanation">${escapeHtml(item.explanation)}</div>`;
            container.appendChild(reviewItem);
        });
        showView('review');
    }

    function showView(name) {
        $$('.view').forEach(v => v.classList.remove('active'));
        $(`#view-${name}`).classList.add('active');
    }

    function escapeHtml(s) {
        return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c]));
    }
    
    function setupEventListeners() {
        $('#appNameClickable').onclick = () => { showView('chapters'); renderChapters(); };
        $('#backToChapters').onclick = () => { showView('chapters'); renderChapters(); };
        $('#toChaptersFromEnd').onclick = () => { showView('chapters'); renderChapters(); };
        $('#backToChaptersFromReview').onclick = () => { showView('chapters'); renderChapters(); };
        
        $('#unlockFromTrialBtn').onclick = () => {
            sessionStorage.clear();
            location.reload();
        };

        $('#retryChapter').onclick = () => {
            const chIdx = state.currentChapterIndex;
            if (state.answers[chIdx]) delete state.answers[chIdx];
            state.currentQIndex = 0;
            saveState();
            hideEndScreen();
            renderQuiz();
        };

        $('#reviewAnswersBtn').onclick = renderReview;
        $('#nextBtn').onclick = next;
        $('#prevBtn').onclick = prev;

        $('#resetProgress').onclick = () => {
            if (confirm('Reset all saved progress?')) {
                clearState();
            }
        };

        $('#chaptersList').addEventListener('click', onChapterOpen);
    }
    
    loadState();
    renderChapters();
    setupEventListeners(); 
    showView('chapters');
}