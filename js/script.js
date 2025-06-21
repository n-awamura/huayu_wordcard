// template/js/common.js
// Add common JavaScript functions here in the future.

// Import Firestore functions (assuming modular import in HTML)
// We access db and auth via window.firebaseInstances set in index.html
const { db, auth } = window.firebaseInstances;
// Functions needed from Firestore SDK (will be used later)
import {
    collection, doc, getDoc, setDoc, updateDoc, arrayUnion, serverTimestamp, query, orderBy, limit, writeBatch,
    getDocs,
    Timestamp,
    deleteDoc
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";

// --- Constants ---
const QUIZ_CONTAINER_ID = 'quiz-container';
const CARD_FRONT_ID = 'cardFront';
const CARD_BACK_ID = 'cardBack';
const ANSWER_INPUT_ID = 'quiz-answer-input';
const NEXT_QUIZ_BUTTON_ID = 'next-quiz-button';
const PREV_QUIZ_BUTTON_ID = 'prev-quiz-button';
const CHECK_ANSWERS_BUTTON_ID = 'check-answers-button';
const RESULTS_CONTAINER_ID = 'results-container';
const RESULTS_LIST_ID = 'results-list';
const LEVEL_SELECT_ID = 'level-select';
const RETRY_SET_BUTTON_ID = 'retry-set-button';
const RESULTS_NEXT_SET_BUTTON_ID = 'results-next-set-button';
const PROGRESS_BAR_ID = 'progress-bar';
const PROGRESS_BAR_FILL_ID = 'progress-bar-fill';
const SET_START_MESSAGE_ID = 'set-start-message';
const QUESTION_NUMBER_DISPLAY_ID = 'question-number-display';
const ACTUAL_QUIZ_QUESTION_ID = 'actual-quiz-question';
const QUIZ_BUBBLE_ID = 'quiz-bubble';
const QUIZ_ELEPHANT_ICON_ID = 'quiz-elephant-icon';
const END_MESSAGE_ID = 'end-message';
const LOADING_INDICATOR_ID = 'loading-indicator';

// Header Menu & Modals
const HEADER_MENU_BUTTON_ID = 'header-menu-button';
const HEADER_MENU_DROPDOWN_ID = 'header-menu-dropdown';
const MENU_ITEM_HISTORY_ID = 'menu-item-history';
const MENU_ITEM_REMAINING_ID = 'menu-item-remaining';
const MENU_ITEM_INITIALIZE_ID = 'menu-item-initialize';
const MENU_ITEM_RESTORE_ID = 'menu-item-restore';
const MENU_ITEM_LOGOUT_ID = 'menu-item-logout';
const HISTORY_MODAL_ID = 'history-modal';
const REMAINING_MODAL_ID = 'remaining-modal';
const CLOSE_HISTORY_MODAL_ID = 'close-history-modal';
const CLOSE_REMAINING_MODAL_ID = 'close-remaining-modal';
const HISTORY_LIST_ID = 'history-list';
const INCORRECT_WORDS_LIST_ID = 'incorrect-words-list';
const CORRECT_WORDS_LIST_ID = 'correct-words-list';
const HISTORY_DETAIL_MODAL_ID = 'history-detail-modal';
const CLOSE_HISTORY_DETAIL_MODAL_ID = 'close-history-detail-modal';
const HISTORY_DETAIL_TITLE_ID = 'history-detail-title';
const HISTORY_DETAIL_LIST_ID = 'history-detail-list';
const USER_DISPLAY_ID = 'user-display';
const PINYIN_INPUT_CONTAINER_ID = 'pinyin-input-container';
const QUIZ_ANSWER_INPUT_ID = 'quiz-answer-input';

// --- NEW: Footer navigation item IDs ---
const FOOTER_MODE_PRONUNCIATION_ID = 'footer-mode-pronunciation';
const FOOTER_MODE_TRANSLATION_ID = 'footer-mode-translation';

// --- Global DOM Element References ---
let levelSelect, quizContainer, setStartMessageElement, questionNumberDisplayElement, actualQuizQuestionElement, answerInputElement,
    nextQuizButton, prevQuizButton, checkAnswersButton, progressBar, progressBarFill, quizBubble, quizElephantIcon,
    endMessageElement, loadingIndicator, resultsContainer, resultsList, resultsNextSetButton, retrySetButton,
    headerMenuButton, headerMenuDropdown, menuItemHistory, menuItemRemaining, menuItemInitialize, menuItemRestore, menuItemLogout,
    historyModal, remainingModal, closeHistoryModalButton, closeRemainingModalButton, historyList,
    incorrectWordsList, correctWordsList, historyDetailModal, closeHistoryDetailModalButton,
    historyDetailTitle, historyDetailList, userDisplay, pinyinInputContainer, quizAnswerInput,
    footerModePronunciation, footerModeTranslation; // --- ADDED footer button refs

// --- Global Variables ---
let allWordsInLevel = [];
let currentLevelTotalWords = 0;
let quizWords = [];
let currentQuizIndex = 0;
let currentLevelId = '';
let currentLevelDisplayName = '';
let currentSet = 1;
const wordsPerSet = 10;
let correctAnswers = 0;
let isLoading = false; // Consider if this overlaps with isLoadingProgress
let isQuizComplete = false;
let quizResults = [];
let currentUserId = null;
let userLevelProgress = {};
let isLoadingProgress = true;
let delayedCarryOverWords = []; // <<< ADDED: Stores { word: wordObject, targetSet: number }
let currentMode = 'pronunciation'; // <<< CHANGED: Default mode is now pronunciation

// Swipe tracking variables
let touchStartX = 0;
let touchEndX = 0;
const swipeThreshold = 50;

// --- Global flag for level change ---
let levelChangedFlag = false;

// --- Utility Functions ---
function showLoading() {
    if (loadingIndicator) loadingIndicator.classList.remove('hidden');
}

function hideLoading() {
    if (loadingIndicator) loadingIndicator.classList.add('hidden');
}

function displayError(message, isCritical = false) {
    console.error("Error displayed:", message);
    hideLoading();
    if (endMessageElement) {
        endMessageElement.textContent = `エラー: ${message}`;
        endMessageElement.classList.remove('hidden');
        endMessageElement.style.color = isCritical ? 'red' : 'orange';
    }
     if (isCritical) {
        if (quizContainer) quizContainer.classList.add('hidden');
         // Safely disable buttons only if they exist
         if (nextQuizButton) nextQuizButton.disabled = true;
         if (prevQuizButton) prevQuizButton.disabled = true;
         if (checkAnswersButton) checkAnswersButton.disabled = true;
         if (answerInputElement) answerInputElement.disabled = true;
         if (resultsNextSetButton) resultsNextSetButton.disabled = true;
         if (retrySetButton) retrySetButton.disabled = true;
         // Safely hide progress bar if it exists
         if (progressBar) progressBar.classList.add('hidden'); // Use progressBar instead of progressElement
     }
}

// --- ADDED: Function to shuffle an array (Fisher-Yates algorithm) ---
function shuffleArray(array) {
  let currentIndex = array.length, randomIndex;

  // While there remain elements to shuffle.
  while (currentIndex > 0) {

    // Pick a remaining element.
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    // And swap it with the current element.
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex], array[currentIndex]];
  }

  return array;
}
// --- End Added shuffleArray ---

// --- ADDED: Calculate remaining words in the current level ---
function calculateRemainingWordsInLevel(levelId) {
    if (!levelId || !userLevelProgress || !allWordsInLevel || allWordsInLevel.length === 0) {
        console.warn("Cannot calculate remaining words: Missing data (levelId, progress, allWords).");
        return allWordsInLevel.length || 0; // Return total words if no progress exists
    }
    const levelData = userLevelProgress[levelId];

    // If no progress data for this level or mode, all words are considered remaining.
    if (!levelData || !levelData[currentMode] || !levelData[currentMode].wordStats) {
        return allWordsInLevel.length;
    }
    const wordStats = levelData[currentMode].wordStats;

    let remainingCount = 0;
    allWordsInLevel.forEach(wordObj => {
        if (wordObj && wordObj.語彙) {
            const stats = wordStats[wordObj.語彙];
            // If a word has no stats or is not 'correct', it's remaining.
            if (!stats || stats.status !== 'correct') {
                remainingCount++;
            }
        }
    });
    console.log(`DEBUG: Calculated remaining words for ${levelId} in mode ${currentMode}: ${remainingCount}`);
    return remainingCount;
}
// --- End Added calculateRemainingWordsInLevel ---

// --- Helper function for answer checking ---
function isAnswerCorrect(userAnswer, correctAnswer) {
    const userAnswerNorm = userAnswer.trim().toLowerCase();
    const correctAnswerNorm = correctAnswer.trim().toLowerCase(); // Normalize correct answer too

    // If they match exactly, it's correct (quick check)
    if (userAnswerNorm === correctAnswerNorm) {
        return true;
    }

    // 1. Handle Slash Alternatives (e.g., "他/她")
    if (correctAnswerNorm.includes('/')) {
        const alternatives = correctAnswerNorm.split('/').map(alt => alt.trim());
        return alternatives.includes(userAnswerNorm);
    }

    // 2. Handle Parentheses for optional parts (e.g., "小孩(子)")
    const optionalMatch = correctAnswerNorm.match(/^(.*?)\((.*?)\)$/);
    if (optionalMatch) {
        const basePart = optionalMatch[1].trim();       // Part before parenthesis (e.g., "小孩")
        const optionalPart = optionalMatch[2].trim();    // Part inside parenthesis (e.g., "子")
        const fullPart = basePart + optionalPart;      // Combined part (e.g., "小孩子")

        // Check if user answer matches the base part OR the full part
        return userAnswerNorm === basePart || userAnswerNorm === fullPart;
    }

    // 3. Default: If none of the above patterns match, it's incorrect based on the initial check
    return false;
}

// --- NEW: Pinyin Utility Functions ---
const toneMarkMap = {
    'ā': ['a', 1], 'á': ['a', 2], 'ǎ': ['a', 3], 'à': ['a', 4], 'ă': ['a', 3],
    'ē': ['e', 1], 'é': ['e', 2], 'ě': ['e', 3], 'è': ['e', 4], 'ĕ': ['e', 3],
    'ī': ['i', 1], 'í': ['i', 2], 'ǐ': ['i', 3], 'ì': ['i', 4], 'ĭ': ['i', 3],
    'ō': ['o', 1], 'ó': ['o', 2], 'ǒ': ['o', 3], 'ò': ['o', 4], 'ŏ': ['o', 3],
    'ū': ['u', 1], 'ú': ['u', 2], 'ǔ': ['u', 3], 'ù': ['u', 4], 'ŭ': ['u', 3],
    'ǖ': ['ü', 1], 'ǘ': ['ü', 2], 'ǚ': ['ü', 3], 'ǜ': ['ü', 4],
};

// --- NEW: Syllable dictionary based on Standard Mandarin Pinyin ---
// This Set contains all valid pinyin syllables (without tones).
// It's used by the new `parsePinyin` function to correctly segment pinyin strings.
const validSyllables = new Set([
  // Zero-initial syllables
  'a', 'o', 'e', 'er', 'ai', 'ei', 'ao', 'ou', 'an', 'en', 'ang', 'eng',
  'yi', 'ya', 'ye', 'yao', 'you', 'yan', 'yin', 'yang', 'ying', 'yong',
  'wu', 'wa', 'wo', 'wai', 'wei', 'wan', 'wen', 'wang', 'weng',
  'yu', 'yue', 'yuan', 'yun',
  // Syllables with initial consonants
  'ba', 'bo', 'bai', 'bei', 'bao', 'ban', 'ben', 'bang', 'beng', 'bi', 'bie', 'biao', 'bian', 'bin', 'bing', 'bu',
  'pa', 'po', 'pai', 'pei', 'pao', 'pou', 'pan', 'pen', 'pang', 'peng', 'pi', 'pie', 'piao', 'pian', 'pin', 'ping', 'pu',
  'ma', 'mo', 'me', 'mai', 'mei', 'mao', 'mou', 'man', 'men', 'mang', 'meng', 'mi', 'mie', 'miao', 'mian', 'min', 'ming', 'mu',
  'fa', 'fo', 'fei', 'fou', 'fan', 'fen', 'fang', 'feng', 'fu',
  'da', 'de', 'dai', 'dei', 'dao', 'dou', 'dan', 'den', 'dang', 'deng', 'dong', 'di', 'die', 'diao', 'diu', 'dian', 'ding', 'duo', 'dui', 'dun', 'duan',
  'ta', 'te', 'tai', 'tao', 'tou', 'tan', 'tang', 'teng', 'tong', 'ti', 'tie', 'tiao', 'tian', 'ting', 'tu', 'tuo', 'tui', 'tun', 'tuan',
  'na', 'ne', 'nai', 'nei', 'nao', 'nou', 'nan', 'nen', 'nang', 'neng', 'nong', 'ni', 'nie', 'niao', 'niu', 'nian', 'nin', 'niang', 'ning', 'nu', 'nü', 'nuo', 'nüe',
  'la', 'le', 'lai', 'lei', 'lao', 'lou', 'lan', 'lang', 'leng', 'long', 'li', 'lia', 'lie', 'liao', 'liu', 'lian', 'lin', 'liang', 'ling', 'lu', 'lü', 'luo', 'lüe',
  'ga', 'ge', 'gai', 'gei', 'gao', 'gou', 'gan', 'gen', 'gang', 'geng', 'gong', 'gu', 'gua', 'guo', 'guai', 'gui', 'gun', 'guang',
  'ka', 'ke', 'kai', 'kei', 'kao', 'kou', 'kan', 'ken', 'kang', 'keng', 'kong', 'ku', 'kua', 'kuo', 'kuai', 'kui', 'kun', 'kuang',
  'ha', 'he', 'hai', 'hei', 'hao', 'hou', 'han', 'hen', 'hang', 'heng', 'hong', 'hu', 'hua', 'huo', 'huai', 'hui', 'hun', 'huang',
  'ji', 'jia', 'jie', 'jiao', 'jiu', 'jian', 'jin', 'jiang', 'jing', 'jiong', 'ju', 'jue', 'juan', 'jun',
  'qi', 'qia', 'qie', 'qiao', 'qiu', 'qian', 'qin', 'qiang', 'qing', 'qiong', 'qu', 'que', 'quan', 'qun',
  'xi', 'xia', 'xie', 'xiao', 'xiu', 'xian', 'xin', 'xiang', 'xing', 'xiong', 'xu', 'xue', 'xuan', 'xun',
  'zha', 'zhe', 'zhi', 'zhai', 'zhei', 'zhao', 'zhou', 'zhan', 'zhen', 'zhang', 'zheng', 'zhong', 'zhu', 'zhua', 'zhuo', 'zhuai', 'zhui', 'zhun', 'zhuang',
  'cha', 'che', 'chi', 'chai', 'chao', 'chou', 'chan', 'chen', 'chang', 'cheng', 'chong', 'chu', 'chua', 'chuo', 'chuai', 'chui', 'chun', 'chuang',
  'sha', 'she', 'shi', 'shai', 'shei', 'shao', 'shou', 'shan', 'shen', 'shang', 'sheng', 'shu', 'shua', 'shuo', 'shuai', 'shui', 'shun', 'shuang',
  'ra', 're', 'ri', 'rao', 'rou', 'ran', 'ren', 'rang', 'reng', 'rong', 'ru', 'ruo', 'rui', 'run',
  'za', 'ze', 'zi', 'zai', 'zei', 'zao', 'zou', 'zan', 'zen', 'zang', 'zeng', 'zong', 'zu', 'zuo', 'zui', 'zun',
  'ca', 'ce', 'ci', 'cai', 'cao', 'cou', 'can', 'cen', 'cang', 'ceng', 'cong', 'cu', 'cuo', 'cui', 'cun',
  'sa', 'se', 'si', 'sai', 'sao', 'sou', 'san', 'sen', 'sang', 'seng', 'song', 'su', 'suo', 'sui', 'sun',
  // special nasals
  'hm', 'hng', 'm', 'n', 'ng',
  // Common r-ending syllables (erhua), add more as needed
  'zher', 'nar', 'wanr', 'huar', 'dianr'
]);


// Helper function to remove tone marks from a pinyin string for dictionary lookup.
function removeTones(pinyinStrWithTones) {
    return pinyinStrWithTones.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ü/g, 'u');
}

/**
 * Segments a pinyin string into an array of valid syllables.
 * This version uses a greedy, longest-match-first approach based on a dictionary of valid syllables.
 * @param {string} s - The pinyin string to segment (e.g., "xihuan").
 * @returns {string[]} An array of segmented syllables (e.g., ["xi", "huan"]).
 */
function segmentPinyin(s) {
    const pinyin = s.toLowerCase().replace(/\s+/g, '');
    let result = [];
    let currentPos = 0;

    while (currentPos < pinyin.length) {
        let found = false;
        // Iterate from the longest possible syllable length down to 1
        for (let len = Math.min(6, pinyin.length - currentPos); len > 0; len--) {
            const sub = pinyin.substring(currentPos, currentPos + len);
            if (validSyllables.has(sub)) {
                result.push(sub);
                currentPos += len;
                found = true;
                break;
            }
        }
        // If no valid syllable is found, treat the single character as a syllable and move on.
        // This handles cases like 'n', 'm', 'r' that can sometimes stand alone or be part of an invalid string.
        if (!found) {
            result.push(pinyin[currentPos]);
            currentPos++;
        }
    }
    return result;
}

// Parses a pinyin string with tone marks into syllables with letters and tone numbers
function parsePinyin(pinyinStrWithTones) {
    if (!pinyinStrWithTones) return [];

    const pinyinParts = pinyinStrWithTones.split("'");
    const finalParsedSyllables = [];

    for (const part of pinyinParts) {
        if (part.length === 0) continue;

        const pinyinStrNoTones = removeTones(part);
        const syllablesNoTones = segmentPinyin(pinyinStrNoTones);

        if (syllablesNoTones === null) {
            console.error(`Failed to parse pinyin part: "${part}"`);
            finalParsedSyllables.push({ letters: pinyinStrNoTones, tone: 5, error: true });
            continue;
        }

        let partToConsume = part;
        for (const syllableNoTone of syllablesNoTones) {
            let consumedOriginal = '';
            // Consume from `partToConsume` until its "no-tone" version matches `syllableNoTone`
            let tempOriginal = '';
            let i = 0;
            while (i < partToConsume.length) {
                tempOriginal += partToConsume[i];
                i++;
                if (removeTones(tempOriginal) === syllableNoTone) {
                    consumedOriginal = tempOriginal;
                    break;
                }
            }
            partToConsume = partToConsume.substring(consumedOriginal.length);

            // Now parse the tones from the `consumedOriginal` syllable
            let letters = '';
            let tone = 5;
            for (const char of consumedOriginal) {
                if (toneMarkMap[char]) {
                    const [baseVowel, toneNumber] = toneMarkMap[char];
                    letters += baseVowel;
                    tone = toneNumber;
                } else {
                    letters += char;
                }
            }
            letters = letters.replace(/v/g, 'ü');
            finalParsedSyllables.push({ letters, tone });
        }
    }

    console.log(`Parsed '${pinyinStrWithTones}' into:`, finalParsedSyllables);
    return finalParsedSyllables;
}
// ------------------------------------

// --- NEW: Pinyin UI Generation ---
function createPinyinInputUI(pinyinString) {
    if (!pinyinInputContainer) return;
    pinyinInputContainer.innerHTML = ''; // Clear previous UI

    const parsedSyllables = parsePinyin(pinyinString);
    if (parsedSyllables.length === 0) return;

    parsedSyllables.forEach((syllable, index) => {
        // Create syllable block container
        const block = document.createElement('div');
        block.className = 'syllable-block';
        block.dataset.syllableIndex = index;

        // Create pinyin letters display
        const letters = document.createElement('div');
        letters.className = 'pinyin-letters';
        letters.textContent = syllable.letters;

        // Create tone buttons container
        const buttons = document.createElement('div');
        buttons.className = 'tone-buttons';

        // Create 5 tone buttons
        for (let i = 1; i <= 5; i++) {
            const btn = document.createElement('button');
            btn.type = 'button'; // Prevent form submission
            btn.className = 'tone-button';
            btn.dataset.tone = i;
            btn.textContent = (i === 5) ? '軽' : i; // Use '軽' for 5th tone
            
            btn.addEventListener('click', (e) => {
                // Remove 'selected' from siblings
                const parent = e.target.parentElement;
                Array.from(parent.children).forEach(child => child.classList.remove('selected'));
                // Add 'selected' to clicked button
                e.target.classList.add('selected');
            });
            buttons.appendChild(btn);
        }

        // Append elements to the block
        block.appendChild(letters);
        block.appendChild(buttons);

        // Append the block to the main container
        pinyinInputContainer.appendChild(block);
    });
}
// ---------------------------------

// --- NEW: Mode Switching Logic ---
function switchMode(newMode) {
    if (currentMode === newMode) return; // Do nothing if mode is the same
    currentMode = newMode;
    console.log(`Mode switched to: ${currentMode}`);

    // Update UI elements based on the new mode
    updateUIForMode();

    // Restart the quiz in the new mode
    delayedCarryOverWords = [];
    console.log("Carry-over words cleared due to mode switch.");
    
    // Determine the new starting set based on the progress for the new mode
    const levelId = levelSelect.value;
    const levelData = userLevelProgress[levelId]?.[currentMode] || { lastCompletedSet: 0 };
    currentSet = (levelData.lastCompletedSet || 0) + 1;
    console.log(`Switched to mode ${currentMode}. New starting set is ${currentSet}`);
    
    startNewQuiz(); // This will re-render the quiz for the new mode
}

function updateUIForMode() {
    // --- Update Footer Button Active State ---
    if (footerModePronunciation && footerModeTranslation) {
        footerModePronunciation.classList.toggle('active', currentMode === 'pronunciation');
        footerModeTranslation.classList.toggle('active', currentMode === 'translation');
    }

    if (currentMode === 'pronunciation') {
        // --- UI for Pronunciation Mode ---
        if (quizAnswerInput) quizAnswerInput.classList.add('hidden');
        if (pinyinInputContainer) pinyinInputContainer.classList.remove('hidden');

        // Update question text placeholder if needed (handled in displayQuiz)
        const questionElement = document.getElementById('actual-quiz-question');
        if(questionElement) questionElement.textContent = "この単語のピンインは？"; // Placeholder text

    } else {
        // --- UI for Translation Mode ---
        if (quizAnswerInput) quizAnswerInput.classList.remove('hidden');
        if (pinyinInputContainer) pinyinInputContainer.classList.add('hidden');
        
        // Update question text placeholder (handled in displayQuiz)
        const questionElement = document.getElementById('actual-quiz-question');
        if(questionElement) questionElement.textContent = "この単語の意味は？"; // Placeholder text
    }
}

// --- Core Logic Functions ---
async function fetchWordsForLevel(levelFile) {
    const filePath = `wordcard_data/${levelFile}.json`;
    console.log(`Fetching all words from: ${filePath}`);
    try {
        const response = await fetch(filePath);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const wordsData = await response.json();

        // --- Log Raw Data Structure ---
        console.log("FETCH_WORDS_LOG: Raw data loaded from JSON. First few items:", wordsData.slice(0, 3));
        if (wordsData.length > 0) {
             console.log("FETCH_WORDS_LOG: Checking first raw item's properties:", Object.keys(wordsData[0]));
        }
        // --- End Log ---

        console.log(`Total words loaded for ${levelFile}: ${wordsData.length}`);
        return wordsData; // Return the full array

    } catch (error) {
        console.error(`Error fetching or processing words from ${filePath}:`, error);
        currentLevelDisplayName = levelSelect.options[levelSelect.selectedIndex].text;
        displayError(`「${currentLevelDisplayName}」の単語読み込みに失敗しました。`, true);
        return []; // Return empty array on error
    }
}

async function startNewQuiz() {
    console.log(`DEBUG: startNewQuiz entered with currentSet = ${currentSet}`);
    if (isLoading) {
        console.log("DEBUG: startNewQuiz returning early because isLoading is true.");
        return;
    }
    const levelToLoad = levelSelect ? levelSelect.value : 'unknown';
    console.log(`DEBUG: startNewQuiz intends to load level: ${levelToLoad}`);

    isLoading = true;
    showLoading();
    isQuizComplete = false;

    // --- Explicit UI Reset ---
    if (quizContainer) quizContainer.classList.remove('hidden');
    if (resultsContainer) resultsContainer.classList.add('hidden');
    if (endMessageElement) endMessageElement.classList.add('hidden');
    if (answerInputElement) answerInputElement.disabled = false;
    if (nextQuizButton) nextQuizButton.classList.remove('hidden');
    if (checkAnswersButton) checkAnswersButton.classList.add('hidden');
    if (progressBar) progressBar.classList.remove('hidden');
    const resultsBubble = document.getElementById('results-bubble');
    if (resultsBubble) resultsBubble.classList.add('hidden');
    // Ensure quiz bubble and its content are shown
    if (quizBubble) quizBubble.classList.remove('hidden'); // Show the quiz bubble
    if (setStartMessageElement) setStartMessageElement.classList.remove('hidden'); // Show the message element inside
    // ------------------------

    // --- Clear delayed carry-over words if starting set 1 or if level just changed ---
    if (currentSet === 1 || levelChangedFlag) {
        console.log(`Clearing delayedCarryOverWords because currentSet=${currentSet} or level changed.`);
        delayedCarryOverWords = []; // Clear the list
        levelChangedFlag = false;
    }
    console.log("DEBUG: Delayed carry-over words at start of new set:", delayedCarryOverWords.map(item => `(${item.word.語彙} for set ${item.targetSet})`));
    // ------------------------------------------------------------------------

    // --- State Reset ---
    currentQuizIndex = 0;
    correctAnswers = 0;
    quizResults = [];
    currentLevelId = levelSelect.value;
    currentLevelDisplayName = levelSelect.options[levelSelect.selectedIndex].text;

    // Fetch all words if necessary
    if (allWordsInLevel.length === 0) {
        console.log("DEBUG: allWordsInLevel is empty, fetching...");
        allWordsInLevel = await fetchWordsForLevel(currentLevelId);
        currentLevelTotalWords = allWordsInLevel.length;
    }
    if (currentLevelTotalWords === 0) {
        console.error("No words loaded for the level.");
        // displayError is already called in fetchWordsForLevel on error
        hideLoading();
        isLoading = false;
        quizContainer.classList.add('hidden');
        if (progressBar) progressBar.classList.add('hidden');
        return;
    }

    // --- Calculate remaining words AFTER ensuring allWordsInLevel is populated ---
    const remainingWords = calculateRemainingWordsInLevel(levelToLoad);
    // --------------------------------------------------------------------------

    // --- Generate Word List for the Set ---
    // 1. Select Words for Review from delayedCarryOverWords
    const reviewWords = [];
    const indicesToRemoveFromDelayed = [];
    const urgentReviewThreshold = wordsPerSet * 1.5;
    const theoreticalStartIndex = (currentSet - 1) * wordsPerSet;
    const remainingNewWordCount = Math.max(0, currentLevelTotalWords - theoreticalStartIndex);
    const isReviewUrgent = remainingNewWordCount < urgentReviewThreshold;
    console.log(`DEBUG: Remaining new words: ${remainingNewWordCount}. Urgent review needed? ${isReviewUrgent}`);

    delayedCarryOverWords.forEach((item, index) => {
        if (item.targetSet <= currentSet || isReviewUrgent) {
            reviewWords.push(item.word);
            indicesToRemoveFromDelayed.push(index);
            console.log(`DEBUG: Selecting word '${item.word.語彙}' for review (target: ${item.targetSet}, current: ${currentSet}, urgent: ${isReviewUrgent})`);
        }
    });

    // 2. Get New Words for the current set number
    const startIndex = (currentSet - 1) * wordsPerSet;
    const endIndex = startIndex + wordsPerSet;
    const newWords = allWordsInLevel.slice(startIndex, endIndex);
    console.log(`DEBUG: New words slice (indices ${startIndex}-${endIndex-1}):`, newWords.map(w=>w.語彙));

    // 3. Combine review words and new words, ensuring uniqueness
    const combinedWordsMap = new Map();
    reviewWords.forEach(word => combinedWordsMap.set(word.語彙, word));
    newWords.forEach(word => combinedWordsMap.set(word.語彙, word));
    let combinedWords = Array.from(combinedWordsMap.values());

    // 4. Shuffle the combined list
    quizWords = shuffleArray(combinedWords);
    console.log(`DEBUG: Final quizWords for set ${currentSet} (count: ${quizWords.length}):`, quizWords.map(w=>w.語彙));

    // 5. Remove selected review words from the delayed list (iterate backwards)
    indicesToRemoveFromDelayed.sort((a, b) => b - a); // Sort indices descending
    indicesToRemoveFromDelayed.forEach(index => {
        delayedCarryOverWords.splice(index, 1);
    });
    console.log("DEBUG: Delayed carry-over words after selection:", delayedCarryOverWords.map(item => `(${item.word.語彙} for set ${item.targetSet})`));
    // --- End Generate Word List ---

    if (quizWords.length === 0) {
        console.log("All words for this level seem to be completed or no words found for this set index.");
        displayError(`レベル「${currentLevelDisplayName}」の単語を全て学習しました！`, false);
        // Handle completion state
        isLoading = false;
        hideLoading();
        return;
    }

    // --- Update UI ---
    updateQuizCounter(); // Still potentially useful if element exists
    updateProgress();

    // --- Display Set Start Message in Bubble ---
    if (setStartMessageElement) {
        setStartMessageElement.innerHTML = `第 ${currentSet} セットだゾウ！🐘<br>がんばるゾウ！<br><br>${currentLevelDisplayName}はあと ${remainingWords} 問！`;
        console.log(`Set start message displayed for set ${currentSet}`);
        // --- Debug Logs Added ---
        console.log("DEBUG: setStartMessageElement content:", setStartMessageElement.innerHTML);
        console.log("DEBUG: setStartMessageElement computed display:", window.getComputedStyle(setStartMessageElement).display);
        // -----------------------
        // Make sure the bubble container is visible
        if(quizBubble) {
             quizBubble.classList.remove('hidden');
             console.log("DEBUG: quizBubble hidden class removed.");
             console.log("DEBUG: quizBubble computed opacity:", window.getComputedStyle(quizBubble).opacity);
        } else {
             console.warn("DEBUG: quizBubble element reference is missing!");
        }
        if(quizElephantIcon) {
             quizElephantIcon.classList.remove('hidden');
        } else {
             console.warn("DEBUG: quizElephantIcon element reference is missing!");
        }
    } else {
        console.warn("Could not display set start message: setStartMessageElement not found.");
    }
    // Clear the actual question area initially
    if (actualQuizQuestionElement) actualQuizQuestionElement.textContent = '';
    // --------------------------------------------

    // Display the first question
    displayQuiz();

    // --- Final State & Focus ---
    prevQuizButton.disabled = true;
    nextQuizButton.disabled = quizWords.length <= 1;
    hideLoading();
    isLoading = false;
    answerInputElement.focus();
}

function displayQuiz() {
    if (quizWords.length === 0 || currentQuizIndex >= quizWords.length) {
        console.log("Attempted to display quiz with no words or invalid index.");
        return;
    }
    isQuizComplete = false;

    const wordData = quizWords[currentQuizIndex];
    const currentQuestionNum = currentQuizIndex + 1;
    console.log(`Displaying quiz ${currentQuestionNum}/${quizWords.length}:`, wordData);

    // --- Display Question Number ---
    if (questionNumberDisplayElement) {
        questionNumberDisplayElement.textContent = `問${currentQuestionNum}`;
    } else {
        console.warn("#question-number-display element not found!");
    }
    // --------------------------------

    // Display Question Text
    if (actualQuizQuestionElement) {
        if (currentMode === 'pronunciation') {
            actualQuizQuestionElement.textContent = wordData.語彙;
            createPinyinInputUI(wordData.拼音); // <<< Call the new UI creation function
        } else { // Translation mode
            actualQuizQuestionElement.textContent = wordData.和訳;
            if (answerInputElement) answerInputElement.value = '';
        }
    } else {
        console.error("#actual-quiz-question element not found!");
    }

    updateQuizCounter();
    updateProgress();

    prevQuizButton.disabled = currentQuizIndex === 0;
    nextQuizButton.disabled = currentQuizIndex === quizWords.length - 1;

    if (currentQuizIndex === quizWords.length - 1) {
        nextQuizButton.classList.add('hidden');
        checkAnswersButton.classList.remove('hidden');
        checkAnswersButton.disabled = false;
    } else {
        nextQuizButton.classList.remove('hidden');
        checkAnswersButton.classList.add('hidden');
    }
    answerInputElement.focus();
}

function updateQuizCounter() {
    const counterElement = document.getElementById('quiz-counter');
    if (counterElement) {
        counterElement.textContent = `${currentQuizIndex + 1} / ${quizWords.length}`;
    }
}

function updateProgress() {
    if (progressBarFill) {
         const progressPercentage = quizWords.length > 0 ? ((currentQuizIndex + 1) / quizWords.length) * 100 : 0;
         progressBarFill.style.width = `${progressPercentage}%`;
         console.log(`Progress updated: ${progressPercentage}%`);
    } else {
        console.warn("#progress-bar-fill element not found for updating progress.");
    }
}

function nextQuiz() {
    recordCurrentAnswer();
    if (currentQuizIndex < quizWords.length - 1) {
        currentQuizIndex++;
        displayQuiz();
    } else if (currentQuizIndex === quizWords.length - 1 && !isQuizComplete) {
        handleQuizCompletion();
    }
}

function prevQuiz() {
    recordCurrentAnswer();
    if (currentQuizIndex > 0) {
        currentQuizIndex--;
        displayQuiz();
    }
}

function recordCurrentAnswer() {
    if (currentQuizIndex < 0 || currentQuizIndex >= quizWords.length) return;

    const currentWord = quizWords[currentQuizIndex];
    let userAnswer;

    if (currentMode === 'pronunciation') {
        const pinyinAnswer = [];
        if (pinyinInputContainer) {
            const syllableBlocks = pinyinInputContainer.querySelectorAll('.syllable-block');
            syllableBlocks.forEach(block => {
                const letters = block.querySelector('.pinyin-letters').textContent.trim();
                const selectedButton = block.querySelector('.tone-button.selected');
                const tone = selectedButton ? parseInt(selectedButton.dataset.tone, 10) : 0; // Use 0 for no selection
                pinyinAnswer.push({ syllable: letters, tone: tone });
            });
        }
        userAnswer = pinyinAnswer; // Store the array of objects
    } else {
        userAnswer = answerInputElement ? answerInputElement.value.trim() : '';
    }

    // Find if a result for the current word already exists
    let resultEntry = quizResults.find(r => r.wordObject?.語彙 === currentWord.語彙);

    if (resultEntry) {
        resultEntry.userAnswer = userAnswer;
        resultEntry.isCorrect = null; // Reset correctness check status
    } else {
        // Define question and correct answer based on mode
        let question, correctAnswer;
        if (currentMode === 'pronunciation') {
            question = currentWord.語彙;
            correctAnswer = currentWord.拼音;
        } else {
            question = currentWord.和訳;
            correctAnswer = currentWord.語彙;
        }

        quizResults.push({
            wordObject: currentWord,
            question: question,
            userAnswer: userAnswer,
            correctAnswer: correctAnswer,
            pinyin: currentWord.拼音, // Always store pinyin for display purposes
            isCorrect: null
        });
    }
    console.log(`Recorded answer for index ${currentQuizIndex}:`, quizResults.find(r => r.wordObject?.語彙 === currentWord.語彙));
}

function handleQuizCompletion() {
    console.log("Quiz set complete. Ready for checking.");
    recordCurrentAnswer();
    isQuizComplete = true;
    answerInputElement.disabled = true;
    nextQuizButton.classList.add('hidden');
    prevQuizButton.disabled = false;
    checkAnswersButton.classList.remove('hidden');
    checkAnswersButton.disabled = false;
    updateProgress();
    if(quizBubble) {
         console.log("Quiz complete bubble message trigger.");
         // Consider adding a message element inside the bubble if needed
    } else {
         console.warn("#quiz-bubble not found for completion message.")
    }
}

function checkAnswers() {
    console.log("Checking answers...");
    recordCurrentAnswer(); // Record the final answer before checking

    correctAnswers = 0;
    quizResults.forEach(result => {
        let isCorrect = false;
        if (currentMode === 'translation') {
            isCorrect = isAnswerCorrect(result.userAnswer, result.correctAnswer);
        } else { // Pronunciation mode
            // The user answer from recordCurrentAnswer is an array of objects
            const pinyinAnswerObject = result.userAnswer;
            isCorrect = comparePinyin(pinyinAnswerObject, result.correctAnswer);
            // NOW, convert the user answer to a string for display purposes
            result.userAnswer = stringifyPinyin(pinyinAnswerObject);
        }
        result.isCorrect = isCorrect;
        if (isCorrect) {
            correctAnswers++;
        }
    });

    console.log(`Checking complete. Correct: ${correctAnswers}/${quizWords.length}`);

    // Update carry-over words based on results
    delayedCarryOverWords = []; // Clear before populating
    quizResults.forEach((result) => {
        if (!result.isCorrect) {
            const targetSet = currentSet + 2; // Reschedule for 2 sets later
            delayedCarryOverWords.push({ word: result.wordObject, targetSet: targetSet });
        }
    });
    console.log(`DEBUG: Delayed carry-over words after checking:`, delayedCarryOverWords.map(item => `(${item.word.語彙} for set ${item.targetSet})`));

    saveProgressToFirestore(currentLevelId, currentSet, quizResults);
    displayResults();
}

function displayResults() {
    console.log("Displaying results...");
    isQuizComplete = true;

    // Calculate remaining words. This is now safe even if no progress exists.
    const remainingWordsCount = calculateRemainingWordsInLevel(currentLevelId);

    // Update elephant's speech bubble
    const resultsBubble = document.getElementById('results-bubble');
    const resultsBubbleText = document.getElementById('results-bubble-text');
    if (resultsBubble && resultsBubbleText) {
        resultsBubble.classList.remove('hidden'); // Make the bubble visible
        if (correctAnswers === quizWords.length) {
            resultsBubbleText.innerHTML = `全問正解だゾウ！🎉<br>素晴らしいゾウ！<br><br>この級の残りはあと ${remainingWordsCount} 問だゾウ！`;
        } else {
            resultsBubbleText.innerHTML = `お疲れさまだゾウ！🐘<br>結果は ${correctAnswers} / ${quizWords.length} 正解だゾウ！<br><br>この級の残りはあと ${remainingWordsCount} 問だゾウ！`;
        }
    }

    resultsList.innerHTML = '';
    quizResults.forEach(result => {
        if (!result || !result.wordObject) {
            console.warn("Skipping rendering of a faulty result item:", result);
            return;
        }

        const li = document.createElement('li');
        li.className = `result-item ${result.isCorrect ? 'correct' : 'incorrect'}`;

        const iconClass = result.isCorrect ? 'bi-check-circle-fill' : 'bi-x-circle-fill';
        const iconColor = result.isCorrect ? 'green' : 'red';

        let answerSection;
        if (currentMode === 'translation') {
             answerSection = `
                <span class="result-user-answer">${result.userAnswer || '(無回答)'}</span>
                ${!result.isCorrect ? `<span class="result-separator">→</span> <span class="result-correct-answer">${result.correctAnswer}</span>` : ''}
             `;
        } else { // Pronunciation
            // In pronunciation mode, result.correctAnswer is the pinyin string (e.g., "hǎo").
            // We use result.pinyin which should be the same, but let's be explicit for clarity.
            answerSection = `
                <span class="result-user-answer">${result.userAnswer || '(無回答)'}</span>
                ${!result.isCorrect ? `<span class="result-separator">→</span> <span class="result-correct-answer">${result.pinyin}</span>` : ''}
            `;
        }

        li.innerHTML = `
            <i class="bi ${iconClass} result-icon" style="color: ${iconColor};"></i>
            <div class="result-text-details">
                <div class="result-question">${result.question}</div>
                <div class="result-answer-line">
                    ${answerSection}
                </div>
            </div>
        `;
        resultsList.appendChild(li);
    });

    // Hide quiz, show results
    quizContainer.classList.add('hidden');
    resultsContainer.classList.remove('hidden');

    // Show/hide buttons
    const isLevelFullyComplete = (remainingWordsCount === 0);
    resultsNextSetButton.classList.toggle('hidden', isLevelFullyComplete);
    retrySetButton.classList.remove('hidden');

    if (isLevelFullyComplete) {
         // Optionally, show a special completion message
         console.log(`Level ${currentLevelId} is fully complete!`);
         // Maybe change the "Next Set" button text to "Level Complete!"
         const endOfLevelMessage = document.createElement('p');
         endOfLevelMessage.textContent = 'このレベルのすべての単語を学習しました！';
         endOfLevelMessage.style.textAlign = 'center';
         endOfLevelMessage.style.fontWeight = 'bold';
         if(resultsContainer.querySelectorAll('p').length < 2) { // Avoid adding duplicate messages
            resultsContainer.appendChild(endOfLevelMessage);
         }
    }
}

/**
 * Compares two pinyin answer objects for equality.
 * @param {Array<Object>} userAnswerPinyin - User's answer, e.g., [{syllable: 'wo', tone: 3}]
 * @param {string} correctAnswerPinyinStr - Correct answer as a string with tone marks, e.g., 'wǒ'
 * @returns {boolean} - True if they represent the same pinyin.
 */
function comparePinyin(userAnswerPinyin, correctAnswerPinyinStr) {
    if (!userAnswerPinyin || !correctAnswerPinyinStr) return false;

    try {
        const correctAnswerParsed = parsePinyin(correctAnswerPinyinStr);
        if (userAnswerPinyin.length !== correctAnswerParsed.length) return false;

        for (let i = 0; i < userAnswerPinyin.length; i++) {
            // Normalize by removing any tone numbers that might have sneaked into the syllable string
            const userSyllable = userAnswerPinyin[i].syllable.replace(/[1-5]/, '');
            const correctSyllable = correctAnswerParsed[i].letters; // 'letters' from parsePinyin
            const userTone = userAnswerPinyin[i].tone;
            const correctTone = correctAnswerParsed[i].tone;
            
            // Allow 0 as a valid answer for neutral tone (5)
            const isToneMatch = (userTone === correctTone) || (userTone === 0 && correctTone === 5);

            if (userSyllable !== correctSyllable || !isToneMatch) {
                return false;
            }
        }
        return true;
    } catch (e) {
        console.error("Error comparing pinyin:", e);
        return false;
    }
}

/**
 * Converts a pinyin answer object back to a displayable string.
 * @param {Array<Object>} pinyinAnswer - The pinyin answer array.
 * @returns {string} - A space-separated string of syllables with tone numbers.
 */
function stringifyPinyin(pinyinAnswer) {
    if (!pinyinAnswer || pinyinAnswer.length === 0) return "(無回答)";
    // Use tone 0 for display as neutral tone if it's 5. Or show nothing.
    return pinyinAnswer.map(p => `${p.syllable}${p.tone > 0 && p.tone < 5 ? p.tone : (p.tone === 5 ? '5' : '')}`).join(' ');
}

function retryCurrentSet() {
    console.log("Retrying current set...");
    isQuizComplete = false;
    currentQuizIndex = 0;
    // Don't reshuffle, just restart from the beginning of the same set
    resultsContainer.classList.add('hidden');
    quizContainer.classList.remove('hidden');
    answerInputElement.disabled = false;
    // Don't clear quizResults, just reset their checked state
    quizResults.forEach(r => r.isCorrect = null);
    displayQuiz();
}

// --- Main Application Logic ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM fully loaded and parsed. Initializing application...");

    // 1. Assign Global DOM References
    try {
        levelSelect = document.getElementById(LEVEL_SELECT_ID);
        quizContainer = document.getElementById(QUIZ_CONTAINER_ID);
        setStartMessageElement = document.getElementById(SET_START_MESSAGE_ID);
        questionNumberDisplayElement = document.getElementById(QUESTION_NUMBER_DISPLAY_ID);
        actualQuizQuestionElement = document.getElementById(ACTUAL_QUIZ_QUESTION_ID);
        answerInputElement = document.getElementById(ANSWER_INPUT_ID);
        nextQuizButton = document.getElementById(NEXT_QUIZ_BUTTON_ID);
        prevQuizButton = document.getElementById(PREV_QUIZ_BUTTON_ID);
        checkAnswersButton = document.getElementById(CHECK_ANSWERS_BUTTON_ID);
        progressBar = document.getElementById(PROGRESS_BAR_ID);
        progressBarFill = document.getElementById(PROGRESS_BAR_FILL_ID);
        quizBubble = document.getElementById(QUIZ_BUBBLE_ID);
        quizElephantIcon = document.getElementById(QUIZ_ELEPHANT_ICON_ID);
        endMessageElement = document.getElementById(END_MESSAGE_ID);
        loadingIndicator = document.getElementById(LOADING_INDICATOR_ID);
        resultsContainer = document.getElementById(RESULTS_CONTAINER_ID);
        resultsList = document.getElementById(RESULTS_LIST_ID);
        resultsNextSetButton = document.getElementById(RESULTS_NEXT_SET_BUTTON_ID);
        retrySetButton = document.getElementById(RETRY_SET_BUTTON_ID);
        headerMenuButton = document.getElementById(HEADER_MENU_BUTTON_ID);
        headerMenuDropdown = document.getElementById(HEADER_MENU_DROPDOWN_ID);
        menuItemHistory = document.getElementById(MENU_ITEM_HISTORY_ID);
        menuItemRemaining = document.getElementById(MENU_ITEM_REMAINING_ID);
        menuItemInitialize = document.getElementById(MENU_ITEM_INITIALIZE_ID);
        menuItemRestore = document.getElementById(MENU_ITEM_RESTORE_ID);
        menuItemLogout = document.getElementById(MENU_ITEM_LOGOUT_ID);
        historyModal = document.getElementById(HISTORY_MODAL_ID);
        remainingModal = document.getElementById(REMAINING_MODAL_ID);
        closeHistoryModalButton = document.getElementById(CLOSE_HISTORY_MODAL_ID);
        closeRemainingModalButton = document.getElementById(CLOSE_REMAINING_MODAL_ID);
        historyList = document.getElementById(HISTORY_LIST_ID);
        incorrectWordsList = document.getElementById(INCORRECT_WORDS_LIST_ID);
        correctWordsList = document.getElementById(CORRECT_WORDS_LIST_ID);
        historyDetailModal = document.getElementById(HISTORY_DETAIL_MODAL_ID);
        closeHistoryDetailModalButton = document.getElementById(CLOSE_HISTORY_DETAIL_MODAL_ID);
        historyDetailTitle = document.getElementById(HISTORY_DETAIL_TITLE_ID);
        historyDetailList = document.getElementById(HISTORY_DETAIL_LIST_ID);
        userDisplay = document.getElementById(USER_DISPLAY_ID);
        pinyinInputContainer = document.getElementById(PINYIN_INPUT_CONTAINER_ID);
        quizAnswerInput = document.getElementById(QUIZ_ANSWER_INPUT_ID);
        footerModePronunciation = document.getElementById(FOOTER_MODE_PRONUNCIATION_ID);
        footerModeTranslation = document.getElementById(FOOTER_MODE_TRANSLATION_ID);
        console.log("DOM references assigned.");
    } catch (error) {
        console.error("Error assigning DOM references:", error);
        alert("ページの初期化中にエラーが発生しました。必須要素が見つからない可能性があります。");
        return;
    }

    // 2. Initial Checks for Essential Elements
    const essentialElements = {
        levelSelect, quizContainer, answerInputElement, nextQuizButton, prevQuizButton, checkAnswersButton,
        resultsContainer, resultsList, resultsNextSetButton, retrySetButton, headerMenuButton, headerMenuDropdown,
        menuItemHistory, menuItemRemaining, menuItemInitialize, menuItemRestore, menuItemLogout, userDisplay, historyModal, remainingModal, historyDetailModal,
        pinyinInputContainer, quizAnswerInput, footerModePronunciation, footerModeTranslation
    };
    const missingElements = Object.entries(essentialElements).filter(([name, element]) => !element).map(([name]) => name);
    if (missingElements.length > 0) {
        const missingList = missingElements.join(', ');
        console.error(`初期化エラー: 必須のDOM要素への参照を取得できません: ${missingList}`);
        alert(`ページの読み込みに失敗しました。必須要素 (${missingList}) が見つかりません。`);
        if(quizContainer) quizContainer.innerHTML = '<p style="color:red;">エラー: ページを正しく読み込めませんでした。</p>';
        return;
    }
    console.log("Essential DOM element check passed.");

    // 3. Header Bubble Logic
    let minguoDateString = '';
    try {
        const today = new Date();
        const year = today.getFullYear();
        const month = (today.getMonth() + 1).toString().padStart(2, '0');
        const day = today.getDate().toString().padStart(2, '0');
        const taiwaneseWeekdays = ["日", "一", "二", "三", "四", "五", "六"];
        minguoDateString = `民國 ${year - 1911}年${month}月${day}日 (${taiwaneseWeekdays[today.getDay()]})`;
    } catch(e) { console.error("Error calculating date for bubble:", e); }
    const headerElephantIcon = document.getElementById('header-elephant-icon');
    const headerSpeechBubble = document.getElementById('header-speech-bubble');
    let bubbleTimeoutId = null;
    if (headerElephantIcon && headerSpeechBubble) {
        headerSpeechBubble.textContent = `今日は${minguoDateString || '...'}だゾウ！`;
        headerSpeechBubble.classList.remove('visible');
        headerElephantIcon.addEventListener('click', () => {
             if (headerSpeechBubble.classList.contains('visible')) {
                 headerSpeechBubble.classList.remove('visible');
                 if (bubbleTimeoutId) clearTimeout(bubbleTimeoutId);
             } else {
                 headerSpeechBubble.classList.add('visible');
                 if (bubbleTimeoutId) clearTimeout(bubbleTimeoutId);
                 bubbleTimeoutId = setTimeout(() => {
                     headerSpeechBubble.classList.remove('visible');
                 }, 6000);
             }
         });
    }

    // 4. Attach Event Listeners
    console.log("Attaching event listeners...");
    headerMenuButton.addEventListener('click', (event) => {
        event.stopPropagation();
        headerMenuDropdown.classList.toggle('hidden');
    });
    document.addEventListener('click', (event) => {
        if (headerMenuDropdown && !headerMenuDropdown.classList.contains('hidden')) {
             if (!headerMenuDropdown.contains(event.target) && event.target !== headerMenuButton) {
                headerMenuDropdown.classList.add('hidden');
            }
        }
    });
    menuItemHistory.addEventListener('click', () => {
        populateHistoryModal();
        openModal(historyModal);
        headerMenuDropdown.classList.add('hidden');
    });
    menuItemRemaining.addEventListener('click', () => {
        if (isLoadingProgress || !currentUserId || allWordsInLevel.length === 0) {
             console.log("Remaining words - Cannot populate yet (loading/no user/no words)");
        } else {
             populateRemainingModal();
             openModal(remainingModal);
        }
        headerMenuDropdown.classList.add('hidden');
    });
    menuItemInitialize.addEventListener('click', async () => {
        if (headerMenuDropdown) headerMenuDropdown.classList.add('hidden');
        if (!currentUserId || !levelSelect) return;
        const levelToInitialize = levelSelect.value;
        const levelNameToInitialize = levelSelect.options[levelSelect.selectedIndex].text;
        if (confirm(`レベル「${levelNameToInitialize}」の学習データを完全に削除して初期化します。よろしいですか？`)) {
            await initializeLevelProgress(levelToInitialize, levelNameToInitialize);
        }
    });
    menuItemRestore.addEventListener('click', () => {
        if (headerMenuDropdown) headerMenuDropdown.classList.add('hidden');
        if (!currentUserId) {
            displayError("ログインしていません。", false);
            return;
        }
        loadProgressFromFirestore(currentUserId);
    });
    menuItemLogout.addEventListener('click', () => {
        if (headerMenuDropdown) headerMenuDropdown.classList.add('hidden');
        auth.signOut().catch((error) => console.error('Sign out error:', error));
    });
    closeHistoryModalButton.addEventListener('click', () => closeModal(historyModal));
    closeRemainingModalButton.addEventListener('click', () => closeModal(remainingModal));
    closeHistoryDetailModalButton.addEventListener('click', () => closeModal(historyDetailModal));
    historyModal.addEventListener('click', (e) => { if (e.target === historyModal) closeModal(historyModal); });
    remainingModal.addEventListener('click', (e) => { if (e.target === remainingModal) closeModal(remainingModal); });
    historyDetailModal.addEventListener('click', (e) => { if (e.target === historyDetailModal) closeModal(historyDetailModal); });

    historyList.addEventListener('click', (event) => {
        const listItem = event.target.closest('li.history-item-clickable');
        if (listItem && listItem.dataset.historyIndex !== undefined) {
            const displayIndex = parseInt(listItem.dataset.historyIndex, 10);
            const currentLevelId = levelSelect.value;
            const levelData = userLevelProgress[currentLevelId]?.[currentMode];
            const history = levelData?.history || [];
            const sortedHistory = [...history].sort((a, b) => (b.date.toDate() - a.date.toDate()));
            if (sortedHistory[displayIndex]) {
                populateHistoryDetailModal(sortedHistory[displayIndex]);
                openModal(historyDetailModal);
            } else {
                console.error('Could not find history data for display index:', displayIndex);
            }
        }
    });

    levelSelect.addEventListener('change', async (event) => {
        const newLevelId = event.target.value;
        if (isLoadingProgress || !currentUserId) return;
        levelChangedFlag = true;
        const levelData = userLevelProgress[newLevelId]?.[currentMode] || { lastCompletedSet: 0 };
        currentSet = (levelData.lastCompletedSet || 0) + 1;
        allWordsInLevel = [];
        currentLevelTotalWords = 0;
        await startNewQuiz();
        saveLastUsedLevel(newLevelId);
    });

    nextQuizButton.addEventListener('click', nextQuiz);
    prevQuizButton.addEventListener('click', prevQuiz);
    checkAnswersButton.addEventListener('click', checkAnswers);
    resultsNextSetButton.addEventListener('click', () => {
        currentSet++;
        startNewQuiz();
    });
    retrySetButton.addEventListener('click', retryCurrentSet);

    answerInputElement.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            if (currentQuizIndex < quizWords.length - 1) {
                nextQuiz();
            } else {
                checkAnswers();
            }
        }
    });
    footerModePronunciation.addEventListener('click', () => switchMode('pronunciation'));
    footerModeTranslation.addEventListener('click', () => switchMode('translation'));
    console.log("All event listeners attached.");

    // 5. Initial UI State
    console.log("Setting initial UI state...");
    checkAnswersButton.classList.add('hidden');
    resultsContainer.classList.add('hidden');
    retrySetButton.classList.add('hidden');
    resultsNextSetButton.classList.add('hidden');
    setStartMessageElement.classList.add('hidden');
    progressBar.classList.add('hidden');
    levelSelect.disabled = true;
    updateUIForMode();
    console.log("Initial UI state set.");

    // 6. Setup Authentication Listener
    console.log("Setting up Firebase Auth listener...");
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            if (currentUserId === user.uid) return;
            currentUserId = user.uid;
            console.log("Auth State Changed: User is signed in:", currentUserId);
            displayUserEmail(user.email);

            let initialLevelId = 'novice_1';
            const userSettingsRef = doc(db, "users", currentUserId);
            try {
                const userSettingsSnap = await getDoc(userSettingsRef);
                if (userSettingsSnap.exists() && userSettingsSnap.data()?.lastUsedLevel) {
                    const loadedLevel = userSettingsSnap.data().lastUsedLevel;
                    if (levelSelect && Array.from(levelSelect.options).some(option => option.value === loadedLevel)) {
                         initialLevelId = loadedLevel;
                         console.log(`Last used level loaded: ${initialLevelId}`);
                    }
                }
            } catch (error) {
                console.error("Error loading last used level:", error);
            }
            if (levelSelect) levelSelect.value = initialLevelId;

            loadProgressFromFirestore(currentUserId);
        } else {
            currentUserId = null;
            userLevelProgress = {};
            isLoadingProgress = false;
            console.log("Auth State Changed: User is signed out.");
            clearUIForSignedOutUser();
            if (!window.location.pathname.includes('login.html')) {
                window.location.href = 'login.html';
            }
        }
    });
    console.log("Firebase Auth listener is active.");
});

// --- Firebase Progress Functions ---
async function loadProgressFromFirestore(userId) {
    if (!userId) {
        isLoadingProgress = false;
        return;
    }
    console.log(`Loading progress from Firestore for user: ${userId}`);
    isLoadingProgress = true;
    userLevelProgress = {};
    if(levelSelect) levelSelect.disabled = true;
    showLoading();

    try {
        const progressCollectionRef = collection(db, "users", userId, "progress");
        const querySnapshot = await getDocs(progressCollectionRef);
        querySnapshot.forEach((doc) => {
            userLevelProgress[doc.id] = doc.data();
            console.log(`  Loaded progress for level: ${doc.id}`);
            if (!userLevelProgress[doc.id].translation) userLevelProgress[doc.id].translation = { history: [], wordStats: {}, lastCompletedSet: 0 };
            if (!userLevelProgress[doc.id].pronunciation) userLevelProgress[doc.id].pronunciation = { history: [], wordStats: {}, lastCompletedSet: 0 };
        });
        console.log("Progress loaded successfully from Firestore:", userLevelProgress);
    } catch (error) {
        console.error("Error loading progress from Firestore:", error);
        displayError("学習データの読み込みに失敗しました。", false);
    } finally {
        const initialLevelId = levelSelect ? levelSelect.value : 'novice_1';
        const initialLevelData = userLevelProgress[initialLevelId]?.[currentMode] || { lastCompletedSet: 0 };
        currentSet = (initialLevelData.lastCompletedSet || 0) + 1;
        console.log(`DEBUG: Calculated next set for loaded progress (${initialLevelId}, ${currentMode}): ${currentSet}`);
        isLoadingProgress = false;
        if(levelSelect) levelSelect.disabled = false;
        hideLoading();
        console.log("Progress loading process complete.");
        await startNewQuiz();
        setupSwipeListeners();
    }
}

async function saveProgressToFirestore(levelId, completedSet, results) {
    if (!currentUserId) {
        console.error("saveProgressToFirestore: No user logged in.");
        return;
    }
    console.log(`Saving progress to Firestore for user: ${currentUserId}, level: ${levelId}, set: ${completedSet}`);

    const now = Timestamp.now();
    const levelDocRef = doc(db, "users", currentUserId, "progress", levelId);

    const historyEntry = {
        set: completedSet,
        date: now,
        correct: results.filter(r => r?.isCorrect).length,
        total: results.length,
        results: results
    };

    const wordStatsUpdates = {};
    if (!userLevelProgress[levelId]) {
        userLevelProgress[levelId] = { translation: { wordStats: {}, history: [], lastCompletedSet: 0 }, pronunciation: { wordStats: {}, history: [], lastCompletedSet: 0 } };
    }
    if (!userLevelProgress[levelId][currentMode]) {
        userLevelProgress[levelId][currentMode] = { wordStats: {}, history: [], lastCompletedSet: 0 };
    }
    const localWordStats = userLevelProgress[levelId][currentMode].wordStats;

    results.forEach(result => {
        if (!result || !result.wordObject) return;
        const wordKey = result.wordObject.語彙; // Use word object for key
        if (!localWordStats[wordKey]) {
             localWordStats[wordKey] = { status: 'unknown', incorrectCount: 0 };
        }
        const currentLocalStat = localWordStats[wordKey];
        if (result.isCorrect) {
            wordStatsUpdates[wordKey] = { status: 'correct' };
            currentLocalStat.status = 'correct';
        } else {
            const newIncorrectCount = (currentLocalStat.incorrectCount || 0) + 1;
            wordStatsUpdates[wordKey] = { status: 'incorrect', incorrectCount: newIncorrectCount };
            currentLocalStat.status = 'incorrect';
            currentLocalStat.incorrectCount = newIncorrectCount;
        }
    });

    const currentLastCompleted = userLevelProgress[levelId]?.[currentMode]?.lastCompletedSet || 0;
    const lastCompletedUpdate = completedSet > currentLastCompleted ? completedSet : currentLastCompleted;

    const dataToSave = {
        [currentMode]: {
            lastCompletedSet: lastCompletedUpdate,
            history: arrayUnion(historyEntry),
            wordStats: wordStatsUpdates
        }
    };

    try {
        await setDoc(levelDocRef, dataToSave, { merge: true });
        console.log("Progress successfully saved to Firestore.");
        userLevelProgress[levelId][currentMode].lastCompletedSet = lastCompletedUpdate;
        if (!Array.isArray(userLevelProgress[levelId][currentMode].history)) {
            userLevelProgress[levelId][currentMode].history = [];
        }
        userLevelProgress[levelId][currentMode].history.unshift(historyEntry);
    } catch (error) {
        console.error("Error saving progress to Firestore:", error);
        displayError("学習データの保存に失敗しました。", false);
    }
}

// --- Auth State Helper Functions ---
function displayUserEmail(email) {
    if (userDisplay && email) {
        userDisplay.textContent = email;
        userDisplay.classList.remove('hidden');
    } else if (userDisplay) {
        userDisplay.classList.add('hidden');
    }
}

function clearUIForSignedOutUser() {
    displayUserEmail(null);
    levelSelect.disabled = true;
    quizContainer.innerHTML = '<p>ログインしてください。</p>';
    checkAnswersButton.classList.add('hidden');
    resultsContainer.classList.add('hidden');
}

// --- Swipe Handlers ---
function handleTouchStart(event) {
    if (quizContainer.contains(event.target)) {
        touchStartX = event.touches[0].clientX;
    } else {
        touchStartX = null;
    }
}

function handleTouchMove(event) {
     if (touchStartX === null) return;
    touchEndX = event.touches[0].clientX;
}

function handleTouchEnd() {
     if (touchStartX === null) return;
    const deltaX = touchEndX !== 0 ? touchEndX - touchStartX : 0;
    if (isQuizComplete || resultsContainer.classList.contains('hidden') === false ) {
        touchStartX = 0; touchEndX = 0; return;
    }
    if (deltaX > swipeThreshold && !prevQuizButton.disabled) {
         prevQuiz();
    } else if (deltaX < -swipeThreshold) {
        if (!nextQuizButton.disabled && currentQuizIndex < quizWords.length - 1) {
            nextQuiz();
        } else if (currentQuizIndex === quizWords.length - 1 && !isQuizComplete) {
             handleQuizCompletion();
        }
    }
    touchStartX = 0; touchEndX = 0;
}

function setupSwipeListeners() {
    if (quizContainer) {
        quizContainer.addEventListener('touchstart', handleTouchStart);
        quizContainer.addEventListener('touchmove', handleTouchMove, { passive: true });
        quizContainer.addEventListener('touchend', handleTouchEnd);
        quizContainer.addEventListener('touchcancel', handleTouchEnd);
        console.log("Swipe listeners attached to quizContainer");
    }
}

// --- Modal and Other UI Functions ---
function openModal(modalElement) {
    if (modalElement) modalElement.classList.remove('hidden');
}

function closeModal(modalElement) {
    if (modalElement) modalElement.classList.add('hidden');
}

function populateHistoryModal() {
    if (isLoadingProgress) {
        historyList.innerHTML = '<li>進捗データを読み込み中です...</li>';
        return;
    }
    if (!currentUserId) {
        historyList.innerHTML = '<li>ログインしていません。</li>';
        return;
    }
    const currentLevelId = levelSelect.value;
    const levelData = userLevelProgress[currentLevelId]?.[currentMode];
    const history = levelData?.history || [];
    historyList.innerHTML = '';
    if (history.length === 0) {
        historyList.innerHTML = '<li>履歴はありません。</li>';
        return;
    }
    history.sort((a, b) => (b.date.toDate() - a.date.toDate()));
    history.forEach((entry, index) => {
         const li = document.createElement('li');
         const dateOptions = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', weekday: 'short' };
         const date = entry.date?.toDate ? entry.date.toDate().toLocaleString('ja-JP', dateOptions) : new Date(entry.date).toLocaleString('ja-JP', dateOptions);
         li.textContent = `${date} - セット ${entry.set} (${entry.correct}/${entry.total} 正解)`;
         li.classList.add('history-item-clickable');
         li.dataset.historyIndex = index;
         historyList.appendChild(li);
    });
}

function populateHistoryDetailModal(historyEntry) {
    if (!historyEntry) {
         historyDetailList.innerHTML = '<li>履歴データの読み込みに失敗しました。</li>';
         historyDetailTitle.textContent = "履歴詳細";
         return;
    }
    let entryDate = historyEntry.date?.toDate ? historyEntry.date.toDate() : new Date(historyEntry.date);
    const dateOptions = { year: 'numeric', month: 'short', day: 'numeric', weekday: 'short' };
    const formattedDate = entryDate ? entryDate.toLocaleDateString('ja-JP', dateOptions) : "日付不明";
    historyDetailTitle.textContent = `履歴詳細 (セット ${historyEntry.set} - ${formattedDate})`;
    historyDetailList.innerHTML = '';
    if (!historyEntry.results || !Array.isArray(historyEntry.results)) {
        historyDetailList.innerHTML = '<li>この履歴には詳細な回答結果は保存されていません。</li>';
        return;
    }
    if (historyEntry.results.length === 0) {
        historyDetailList.innerHTML = '<li>このセットの回答結果データが見つかりませんでした。</li>';
        return;
    }
    historyEntry.results.forEach(result => {
        if (!result) return;
        const li = document.createElement('li');
        li.classList.add('result-item', result.isCorrect ? 'correct' : 'incorrect');
        li.innerHTML = `
            <span class="result-icon">${result.isCorrect ? '✅' : '❌'}</span>
            <div class="result-text-details">
                <span class="result-question">問: ${result.question || '-'}</span>
                <div class="result-answer-line">
                    <span class="result-user-answer">答: ${result.userAnswer || '(未回答)'}</span>
                    ${!result.isCorrect ? `<span class="result-separator">➔</span><span class="result-correct-answer">${result.correctAnswer || '-'}</span>` : ''}
                    <span class="result-pinyin">(${result.pinyin || '-'})</span>
                </div>
            </div>
        `;
        historyDetailList.appendChild(li);
    });
}

function populateRemainingModal() {
    if (isLoadingProgress || !currentUserId) {
        incorrectWordsList.innerHTML = '<li>進捗データを読み込み中です...</li>';
        correctWordsList.innerHTML = '';
        return;
    }
    const currentLevelId = levelSelect.value;
    const levelData = userLevelProgress[currentLevelId]?.[currentMode] || { wordStats: {} };
    const wordStats = levelData.wordStats;
    if (allWordsInLevel.length === 0) {
         incorrectWordsList.innerHTML = '<li>単語リストを読み込めませんでした。</li>';
         correctWordsList.innerHTML = '';
         return;
    }
    incorrectWordsList.innerHTML = '';
    correctWordsList.innerHTML = '';
    let incorrectCountTotal = 0;
    let correctCountTotal = 0;
    allWordsInLevel.forEach(wordObj => {
        if (!wordObj || !wordObj.語彙) return;
        const word = wordObj.語彙;
        const stats = wordStats[word];
        const li = document.createElement('li');
        const isCorrect = stats && stats.status === 'correct';
        if (isCorrect) {
            li.textContent = word;
            correctWordsList.appendChild(li);
            correctCountTotal++;
        } else {
            const incorrectCount = stats?.incorrectCount || 0;
            if (incorrectCount > 1) {
                li.innerHTML = `<b>${word}</b> <span class="count">(${incorrectCount}回)</span>`;
            } else {
                li.textContent = word;
            }
            incorrectWordsList.appendChild(li);
            incorrectCountTotal++;
        }
    });
    if (incorrectCountTotal === 0) {
        incorrectWordsList.innerHTML = '<li>未正解・未学習の単語はありません。</li>';
    }
    if (correctCountTotal === 0) {
        correctWordsList.innerHTML = '<li>正解済みの単語はありません。</li>';
    }
}

async function initializeLevelProgress(levelId, levelName) {
    if (!currentUserId || !levelId) {
        displayError("レベルの初期化に失敗しました。", false);
        return;
    }
    console.log(`Attempting to initialize level: ${levelId} for user: ${currentUserId}`);
    const levelDocRef = doc(db, "users", currentUserId, "progress", levelId);
    try {
        showLoading();
        await deleteDoc(levelDocRef);
        console.log(`Successfully deleted Firestore document for level: ${levelId}`);
        if (userLevelProgress[levelId]) {
            delete userLevelProgress[levelId];
            console.log(`Cleared local progress for level: ${levelId}`);
        }
        delayedCarryOverWords = [];
        if (levelSelect && levelSelect.value === levelId) {
            currentSet = 1;
            await startNewQuiz();
        }
        hideLoading();
        alert(`レベル「${levelName}」の学習データが初期化されました。`);
    } catch (error) {
        console.error(`Error initializing level ${levelId}:`, error);
        displayError(`レベル「${levelName}」の初期化に失敗しました。`, false);
        hideLoading();
    }
}

// --- NEW: Function to save the last used level ---
async function saveLastUsedLevel(levelId) {
    if (!currentUserId) {
        console.warn("Cannot save last used level: No user logged in.");
        return;
    }
    if (!levelId) {
        console.warn("Cannot save last used level: Invalid levelId provided.");
        return;
    }

    const userSettingsRef = doc(db, "users", currentUserId);
    try {
        await setDoc(userSettingsRef, {
            lastUsedLevel: levelId
        }, { merge: true }); // Use merge:true to create/update the field without overwriting other user data
        console.log(`Last used level (${levelId}) saved to Firestore for user ${currentUserId}.`);
    } catch (error) {
        console.error(`Error saving last used level (${levelId}) to Firestore:`, error);
        // Optionally notify the user or retry?
    }
}

