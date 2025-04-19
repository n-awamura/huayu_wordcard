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

// --- Global DOM Element References ---
let levelSelect, quizContainer, setStartMessageElement, questionNumberDisplayElement, actualQuizQuestionElement, answerInputElement,
    nextQuizButton, prevQuizButton, checkAnswersButton, progressBar, progressBarFill, quizBubble, quizElephantIcon,
    endMessageElement, loadingIndicator, resultsContainer, resultsList, resultsNextSetButton, retrySetButton,
    headerMenuButton, headerMenuDropdown, menuItemHistory, menuItemRemaining, menuItemInitialize, menuItemRestore, menuItemLogout,
    historyModal, remainingModal, closeHistoryModalButton, closeRemainingModalButton, historyList,
    incorrectWordsList, correctWordsList, historyDetailModal, closeHistoryDetailModalButton,
    historyDetailTitle, historyDetailList, userDisplay;

// --- Global Variables ---
let allWordsInLevel = [];
let currentLevelTotalWords = 0;
let quizWords = [];
let currentQuizIndex = 0;
let currentLevelName = '';
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
        return "?"; // Return placeholder if data is missing
    }
    const levelData = userLevelProgress[levelId] || { wordStats: {} };
    const wordStats = levelData.wordStats;
    let remainingCount = 0;
    allWordsInLevel.forEach(wordObj => {
        if (wordObj && wordObj.語彙) {
            const stats = wordStats[wordObj.語彙];
            if (!stats || stats.status !== 'correct') {
                remainingCount++;
            }
        }
    });
    console.log(`DEBUG: Calculated remaining words for ${levelId}: ${remainingCount}`);
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
             // No longer expect 序號
             // console.log("FETCH_WORDS_LOG: First raw item's 序號:", wordsData[0]?.序號);
        }
        // --- End Log ---

        console.log(`Total words loaded for ${levelFile}: ${wordsData.length}`);
        return wordsData; // Return the full array

    } catch (error) {
        console.error(`Error fetching or processing words from ${filePath}:`, error);
        currentLevelName = levelSelect.options[levelSelect.selectedIndex].text;
        displayError(`「${currentLevelName}」の単語読み込みに失敗しました。`, true);
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
    const currentLevelFile = levelSelect.value;
    currentLevelName = levelSelect.options[levelSelect.selectedIndex].text;

    // Fetch all words if necessary
    if (allWordsInLevel.length === 0) {
        console.log("DEBUG: allWordsInLevel is empty, fetching...");
        allWordsInLevel = await fetchWordsForLevel(currentLevelFile);
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
        displayError(`レベル「${currentLevelName}」の単語を全て学習しました！`, false);
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
        setStartMessageElement.innerHTML = `第 ${currentSet} セットだゾウ！🐘<br>がんばるゾウ！<br><br>${currentLevelName}はあと ${remainingWords} 問！`;
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
        actualQuizQuestionElement.textContent = wordData.和訳 || 'N/A';
    } else {
        console.error("#actual-quiz-question element not found!");
    }

    answerInputElement.value = '';
    const savedResult = quizResults[currentQuizIndex];
    if (savedResult && savedResult.userAnswer !== undefined) {
        answerInputElement.value = savedResult.userAnswer;
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
    const userAnswer = answerInputElement ? answerInputElement.value.trim() : '';

    // Find if result already exists
    let resultEntry = quizResults.find(r => r.wordObject?.語彙 === currentWord.語彙);

    if (resultEntry) {
        resultEntry.userAnswer = userAnswer;
        resultEntry.isCorrect = null; // Reset correctness check status
    } else {
        quizResults.push({
            // Store the whole object!
            wordObject: currentWord,
            question: currentWord.和訳, // Or other property based on quiz direction
            userAnswer: userAnswer,
            correctAnswer: currentWord.語彙,
            pinyin: currentWord.拼音,
            isCorrect: null
        });
    }
    console.log(`Recorded answer for index ${currentQuizIndex}:`, quizResults[quizResults.length - 1]);
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
    if (!isQuizComplete) {
         if (currentQuizIndex === quizWords.length - 1) {
             recordCurrentAnswer();
             isQuizComplete = true;
         } else {
            console.warn("Check answers called before quiz completion.");
            return;
         }
    }

    correctAnswers = 0;
    // const incorrectWordsFromThisSet = []; // No longer needed directly here

    quizResults.forEach(result => {
         if (result && result.wordObject) { // Check if wordObject exists
             result.isCorrect = isAnswerCorrect(result.userAnswer, result.correctAnswer);
             const wordVocab = result.wordObject.語彙;

             if (result.isCorrect) {
                 correctAnswers++;
                 // --- Remove from delayed list if answered correctly ---
                 const indexInDelayed = delayedCarryOverWords.findIndex(item => item.word.語彙 === wordVocab);
                 if (indexInDelayed !== -1) {
                     console.log(`DEBUG: Word '${wordVocab}' answered correctly, removing from delayed review.`);
                     delayedCarryOverWords.splice(indexInDelayed, 1);
                 }
                 // ----------------------------------------------------
             } else {
                 // --- Add to delayed list if answered incorrectly ---
                 const isAlreadyDelayed = delayedCarryOverWords.some(item => item.word.語彙 === wordVocab);
                 if (!isAlreadyDelayed) {
                     const targetSet = currentSet + 2;
                     console.log(`DEBUG: Word '${wordVocab}' answered incorrectly, scheduling for review in/after set ${targetSet}.`);
                     delayedCarryOverWords.push({ word: result.wordObject, targetSet: targetSet });
                 } else {
                     console.log(`DEBUG: Word '${wordVocab}' answered incorrectly, but already scheduled for review. No change to schedule.`);
                 }
                 // ----------------------------------------------------
             }
         } else {
             console.warn("Missing result or wordObject during checking.");
         }
    });

    console.log(`Checking complete. Correct: ${correctAnswers}/${quizWords.length}`);
    console.log("DEBUG: Delayed carry-over words after checking:", delayedCarryOverWords.map(item => `(${item.word.語彙} for set ${item.targetSet})`));

    // --- Save progress --- 
    const currentLevelId = levelSelect.value;
    saveProgressToFirestore(currentLevelId, currentSet, quizResults);
    displayResults();
}

function displayResults() {
    console.log("Displaying results...");
    quizContainer.classList.add('hidden');
    resultsContainer.classList.remove('hidden');
    resultsList.innerHTML = '';

    const resultsBubbleTextElement = document.getElementById('results-bubble-text');
    let resultsMessage = "お疲れさまだゾウ！🐘<br>結果を見てほしいゾウ！"; // Default message

    const potentialNextSetStartIndex = currentSet * wordsPerSet;
    const isLevelComplete = potentialNextSetStartIndex >= currentLevelTotalWords;

    // --- Calculate remaining words AFTER grading ---
    const remainingWordsAfterSet = calculateRemainingWordsInLevel(levelSelect.value);
    // ---------------------------------------------

    if (isLevelComplete) {
        resultsNextSetButton.disabled = true;
        resultsNextSetButton.textContent = "レベル完了！";
        resultsMessage = `すごいゾウ！🐘<br>「${currentLevelName}」を全部終えたんだゾウ！`;
    } else {
        resultsNextSetButton.disabled = false;
        resultsNextSetButton.textContent = "次のセットへ →";
    }

    // Add remaining count to the message
    resultsMessage += `<br><br>${currentLevelName}はあと ${remainingWordsAfterSet} 問！`;

    if (resultsBubbleTextElement) {
        resultsBubbleTextElement.innerHTML = resultsMessage;
        const resultsBubbleContainer = document.getElementById('results-bubble');
        if(resultsBubbleContainer) resultsBubbleContainer.classList.remove('hidden');
    } else {
        console.warn("#results-bubble-text element not found!");
        // Fallback
        const resultsBubbleContainer = document.getElementById('results-bubble');
        if (resultsBubbleContainer) {
            resultsBubbleContainer.innerHTML = resultsMessage; // Use innerHTML here too
            resultsBubbleContainer.classList.remove('hidden');
        }
    }

    resultsNextSetButton.classList.remove('hidden');
    retrySetButton.classList.remove('hidden');

    quizResults.forEach(result => {
        if (!result) { console.warn("Skipping undefined result during display."); return; }
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
        resultsList.appendChild(li);
    });
}

function retryCurrentSet() {
    console.log(`Retrying current set: ${currentSet}`);
    delayedCarryOverWords = []; // Clear delayed carry-overs
    startNewQuiz();
}

// --- Swipe Handlers ---
function handleTouchStart(event) {
    // Check if the touch started inside the quiz container
    if (quizContainer.contains(event.target)) {
        touchStartX = event.touches[0].clientX;
        // Optionally change cursor for the container
        // quizContainer.style.cursor = 'grabbing';
        console.log('Touch start inside quiz container');
    } else {
        touchStartX = null; // Ignore touches starting outside
    }
}

function handleTouchMove(event) {
     if (touchStartX === null) return;
    touchEndX = event.touches[0].clientX;
}

function handleTouchEnd() {
     if (touchStartX === null) return;
    const deltaX = touchEndX !== 0 ? touchEndX - touchStartX : 0;
    // quizContainer.style.cursor = 'auto'; // Restore cursor

    if (isQuizComplete || resultsContainer.classList.contains('hidden') === false ) {
        console.log("Swipe ignored: Quiz complete or results shown.");
        touchStartX = 0; touchEndX = 0; return;
    }

    if (deltaX > swipeThreshold && !prevQuizButton.disabled) {
         console.log("Swipe Right detected on quiz container");
         prevQuiz();
    } else if (deltaX < -swipeThreshold) {
        console.log("Swipe Left detected on quiz container");
        if (!nextQuizButton.disabled && currentQuizIndex < quizWords.length - 1) {
            nextQuiz();
        } else if (currentQuizIndex === quizWords.length - 1 && !isQuizComplete) {
             console.log("Swipe Left on last question - triggering completion.");
             handleQuizCompletion();
        }
    } else {
        // console.log("Tap or small swipe detected on quiz container");
    }
    touchStartX = 0; touchEndX = 0;
}

function setupSwipeListeners() {
    if (quizContainer) {
        // Use non-passive for start? Usually not needed unless preventing scroll
        quizContainer.addEventListener('touchstart', handleTouchStart);
        quizContainer.addEventListener('touchmove', handleTouchMove, { passive: true });
        quizContainer.addEventListener('touchend', handleTouchEnd);
        quizContainer.addEventListener('touchcancel', handleTouchEnd);
        console.log("Swipe listeners attached to quizContainer");
    } else {
        console.error("Could not attach swipe listeners: quizContainer not found.");
    }
}

// --- Modal and Other UI Functions ---
function openModal(modalElement) {
    if (modalElement) {
        console.log(`DEBUG: openModal called for ${modalElement.id}`); // Log function call
        modalElement.classList.remove('hidden');
    } else {
        console.warn("DEBUG: openModal called with null element.");
    }
}

function closeModal(modalElement) {
    if (modalElement) {
        console.log(`DEBUG: closeModal called for ${modalElement.id}`); // Log function call
        modalElement.classList.add('hidden');
    } else {
        console.warn("DEBUG: closeModal called with null element.");
    }
}

function populateHistoryModal() {
    console.log("DEBUG: populateHistoryModal called."); // Log function call
    if (isLoadingProgress) {
        historyList.innerHTML = '<li>進捗データを読み込み中です...</li>';
        return;
    }
    if (!currentUserId) {
        historyList.innerHTML = '<li>ログインしていません。</li>';
        return;
    }
    const currentLevelId = levelSelect.value;
    const levelData = userLevelProgress[currentLevelId]; // Use Firestore data

    // Rest of the function needs adjustment based on how history is stored in Firestore
    // Assuming levelData.history exists and is an array of objects
    const history = levelData?.history || [];
    historyList.innerHTML = '';

    if (history.length === 0) {
        historyList.innerHTML = '<li>履歴はありません。</li>';
        return;
    }

    // Sort history by date descending (newest first) - Firestore might return it sorted
    history.sort((a, b) => new Date(b.date) - new Date(a.date));

    history.forEach((entry, index) => {
        // ... (Existing date formatting and list item creation)
        // Make sure entry structure matches what's saved in Firestore
         const li = document.createElement('li');
         const dateOptions = {
             year: 'numeric', month: 'short', day: 'numeric',
             hour: '2-digit', minute: '2-digit',
             weekday: 'short'
         };
         // Firestore timestamp might need .toDate()
         const date = entry.date?.toDate ? entry.date.toDate().toLocaleString('ja-JP', dateOptions) : new Date(entry.date).toLocaleString('ja-JP', dateOptions);
         li.textContent = `${date} - セット ${entry.set} (${entry.correct}/${entry.total} 正解)`;
         li.classList.add('history-item-clickable');
         li.dataset.historyIndex = index; // Index based on the sorted array
         // Store the actual entry data temporarily if needed, or retrieve from userLevelProgress again on click
         historyList.appendChild(li);
    });
}

function populateHistoryDetailModal(historyEntry) {
    console.log("DEBUG: populateHistoryDetailModal called with entry:", historyEntry);
    if (!historyEntry) {
         console.error("Cannot populate history detail: historyEntry is null or undefined.");
         historyDetailList.innerHTML = '<li>履歴データの読み込みに失敗しました。</li>';
         historyDetailTitle.textContent = "履歴詳細"; // Reset title
         return;
    }

    // --- FIX: Convert Firestore Timestamp to JS Date ---
    let entryDate = null;
    if (historyEntry.date?.toDate) { // Check if it has the toDate method
        entryDate = historyEntry.date.toDate();
    } else if (historyEntry.date) { // Fallback for potential older data or already converted date
        entryDate = new Date(historyEntry.date);
    }

    const dateOptions = { year: 'numeric', month: 'short', day: 'numeric', weekday: 'short' };
    // Use the converted entryDate object
    const formattedDate = entryDate ? entryDate.toLocaleDateString('ja-JP', dateOptions) : "日付不明";
    // --- End Fix ---

    historyDetailTitle.textContent = `履歴詳細 (セット ${historyEntry.set} - ${formattedDate})`;
    historyDetailList.innerHTML = ''; // Clear previous list

    // Check specifically for the results property
    if (!historyEntry.results || !Array.isArray(historyEntry.results)) {
        console.warn("Populating history detail: Detailed results (results array) not found for this entry. It might be older data.");
        historyDetailList.innerHTML = '<li>この履歴には詳細な回答結果は保存されていません。</li>';
        return; // Stop here, showing only the message
    }

    // Proceed with populating details if results exist
    if (historyEntry.results.length === 0) {
        historyDetailList.innerHTML = '<li>このセットの回答結果データが見つかりませんでした。</li>';
        return;
    }

    historyEntry.results.forEach(result => {
        if (!result) { console.warn("Skipping undefined result in history detail."); return; }
        const li = document.createElement('li');
        li.classList.add('result-item', result.isCorrect ? 'correct' : 'incorrect');
        // Use the same structure as the main results display
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
    console.log("DEBUG: populateRemainingModal called.");
    if (isLoadingProgress) {
        incorrectWordsList.innerHTML = '<li>進捗データを読み込み中です...</li>';
        correctWordsList.innerHTML = '';
        return;
    }
    if (!currentUserId) {
        incorrectWordsList.innerHTML = '<li>ログインしていません。</li>';
        correctWordsList.innerHTML = '';
        return;
    }

    const currentLevelId = levelSelect.value;
    const levelData = userLevelProgress[currentLevelId] || { wordStats: {} };
    const wordStats = levelData.wordStats;

    // --- DEBUG: Log wordStats before loop ---
    console.log(`DEBUG: populateRemainingModal - Current level (${currentLevelId}) wordStats:`, JSON.parse(JSON.stringify(wordStats)));
    console.log(`DEBUG: populateRemainingModal - allWordsInLevel length: ${allWordsInLevel.length}`);
    // ----------------------------------------

    if (allWordsInLevel.length === 0) {
         console.warn("populateRemainingModal: allWordsInLevel is empty. Cannot determine word list.");
         incorrectWordsList.innerHTML = '<li>単語リストを読み込めませんでした。</li>';
         correctWordsList.innerHTML = '';
         // Optionally trigger fetchWordsForLevel here if needed, but prefer loading it earlier.
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

        // --- DEBUG: Log classification logic ---
        const isCorrect = stats && stats.status === 'correct';
        console.log(`DEBUG: Classifying word: '${word}', Stats:`, stats, `, Is Correct?: ${isCorrect}`);
        // ---------------------------------------

        if (isCorrect) {
            li.textContent = word;
            correctWordsList.appendChild(li);
            correctCountTotal++;
        } else { // Treat incorrect and unknown the same for this list
            const incorrectCount = stats?.incorrectCount || 0;
            if (incorrectCount > 1) {
                li.innerHTML = `<b>${word}</b> <span class="count">(${incorrectCount}回)</span>`;
            } else {
                 // Show words with 1 mistake or unknown words without count
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
    // Clear dynamic content, reset UI elements
    displayUserEmail(null);
    levelSelect.disabled = true; // Disable level selection
    quizContainer.innerHTML = '<p>ログインしてください。</p>'; // Clear quiz area
    // Hide buttons, clear progress bars, etc.
    checkAnswersButton.classList.add('hidden');
    resultsContainer.classList.add('hidden');
    // ... hide other relevant elements ...
}

// --- Firebase Progress Functions ---
async function loadProgressFromFirestore(userId) {
    if (!userId) {
        console.log("loadProgressFromFirestore: No userId provided.");
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
            // doc.id will be the levelId (e.g., "novice_1")
            // doc.data() will be the object { lastCompletedSet, history, wordStats }
            userLevelProgress[doc.id] = doc.data();
            console.log(`  Loaded progress for level: ${doc.id}`, userLevelProgress[doc.id]);
            // Ensure data structure integrity (optional, but good practice)
            if (!userLevelProgress[doc.id].history) userLevelProgress[doc.id].history = [];
            if (!userLevelProgress[doc.id].wordStats) userLevelProgress[doc.id].wordStats = {};
        });

        console.log("Progress loaded successfully from Firestore:", userLevelProgress);
    } catch (error) {
        console.error("Error loading progress from Firestore:", error);
        displayError("学習データの読み込みに失敗しました。", false);
    } finally {
        // --- Determine initial starting set based on loaded progress and CURRENT levelSelect value ---
        const initialLevelId = levelSelect ? levelSelect.value : 'novice_1'; // Use current dropdown value
        const initialLevelData = userLevelProgress[initialLevelId] || { lastCompletedSet: 0 };
        const calculatedNextSet = (initialLevelData.lastCompletedSet || 0) + 1;
        currentSet = calculatedNextSet;
        console.log(`DEBUG: Calculated next set for loaded progress (${initialLevelId}): ${calculatedNextSet}. Global currentSet is now: ${currentSet}`);
        // ------------------------------------
        isLoadingProgress = false;
        if(levelSelect) levelSelect.disabled = false; // Re-enable select
        hideLoading();
        console.log("Progress loading process complete.");

        // Start the first quiz and setup swipe listeners
        console.log(`DEBUG: About to call startNewQuiz with currentSet = ${currentSet}`);
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

    // --- Prepare data for Firestore --- 
    const now = Timestamp.now(); // Use Firestore Timestamp for consistency
    const levelDocRef = doc(db, "users", currentUserId, "progress", levelId);

    // 1. Prepare History Entry
    const historyEntry = {
        set: completedSet,
        date: now,
        correct: results.filter(r => r?.isCorrect).length,
        total: results.length,
        results: results // Include detailed results
    };

    // 2. Prepare Word Stats Updates and Update Local State Immediately
    const wordStatsUpdates = {}; // Object to hold updates for Firestore merge
    // Ensure userLevelProgress structure exists locally
    if (!userLevelProgress[levelId]) userLevelProgress[levelId] = { wordStats: {}, history: [], lastCompletedSet: 0 };
    if (!userLevelProgress[levelId].wordStats) userLevelProgress[levelId].wordStats = {};
    const localWordStats = userLevelProgress[levelId].wordStats; // Reference for local updates

    results.forEach(result => {
        if (!result || !result.correctAnswer) return;
        const wordKey = result.correctAnswer;
        // --- REMOVED dot notation field names ---
        // const statusField = `wordStats.${wordKey}.status`;
        // const incorrectCountField = `wordStats.${wordKey}.incorrectCount`;

        // Ensure local structure for the word exists
        if (!localWordStats[wordKey]) {
             localWordStats[wordKey] = { status: 'unknown', incorrectCount: 0 };
        }
        const currentLocalStat = localWordStats[wordKey]; // Get reference to local stat object

        if (result.isCorrect) {
            // Prepare update for Firestore using wordKey as the key
            wordStatsUpdates[wordKey] = {
                status: 'correct',
                // Optionally reset incorrect count in Firestore as well
                // incorrectCount: 0
            };
            // Update local status
            currentLocalStat.status = 'correct';
            // Optionally reset local incorrect count
            // currentLocalStat.incorrectCount = 0;
        } else {
            const newIncorrectCount = (currentLocalStat.incorrectCount || 0) + 1;
             // Prepare update for Firestore using wordKey as the key
            wordStatsUpdates[wordKey] = {
                status: 'incorrect',
                incorrectCount: newIncorrectCount
            };
            // Update local state immediately
            currentLocalStat.status = 'incorrect';
            currentLocalStat.incorrectCount = newIncorrectCount;
        }
        // console.log(`DEBUG: Local wordStats for '${wordKey}' updated:`, currentLocalStat); // Keep this log
        console.log(`DEBUG: Prepared Firestore update for '${wordKey}':`, wordStatsUpdates[wordKey]); // Log the object being prepared
    });

    // 3. Prepare lastCompletedSet update (only if higher)
    const currentLastCompleted = userLevelProgress[levelId]?.lastCompletedSet || 0;
    const lastCompletedUpdate = completedSet > currentLastCompleted ? completedSet : currentLastCompleted;

    // --- Perform Firestore Write --- 
    try {
        console.log("DEBUG: Data being sent to setDoc (merge:true):", {
            lastCompletedSet: lastCompletedUpdate,
            history: "(arrayUnion entry - not shown)", // Avoid logging potentially large array
            wordStats: wordStatsUpdates // This map will be merged
        });
        await setDoc(levelDocRef, {
            lastCompletedSet: lastCompletedUpdate,
            history: arrayUnion(historyEntry), // Add new entry to the history array
            wordStats: wordStatsUpdates // Pass the map of word updates for merging
        }, { merge: true });

        console.log("Progress successfully saved to Firestore.");

        // Update local state for lastCompletedSet and history (wordStats already updated)
        if (!userLevelProgress[levelId]) userLevelProgress[levelId] = { history: [] };
        userLevelProgress[levelId].lastCompletedSet = lastCompletedUpdate;
        // Add to local history (ensure it's an array)
        if (!Array.isArray(userLevelProgress[levelId].history)) userLevelProgress[levelId].history = [];
        userLevelProgress[levelId].history.unshift(historyEntry); // Add to beginning locally for immediate display

    } catch (error) {
        console.error("Error saving progress to Firestore:", error);
        displayError("学習データの保存に失敗しました。", false);
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

// --- NEW: Function to delete progress for a specific level ---
async function initializeLevelProgress(levelId) {
    if (!currentUserId) {
        console.error("Cannot initialize level: No user logged in.");
        displayError("ログインしていません。", false);
        return false; // Indicate failure
    }
    if (!levelId) {
        console.error("Cannot initialize level: Invalid levelId.");
        displayError("レベルの初期化に失敗しました (無効なレベル)。", false);
        return false; // Indicate failure
    }

    console.log(`Attempting to initialize level: ${levelId} for user: ${currentUserId}`);
    const levelDocRef = doc(db, "users", currentUserId, "progress", levelId);

    try {
        showLoading();
        await deleteDoc(levelDocRef);
        console.log(`Successfully deleted Firestore document for level: ${levelId}`);

        // Clear local progress data for the level
        if (userLevelProgress[levelId]) {
            delete userLevelProgress[levelId];
            console.log(`Cleared local progress for level: ${levelId}`);
        }

        // Clear delayed carry-overs when initializing
        delayedCarryOverWords = [];
        // Reset currentSet if the initialized level was the current one
        if (levelSelect && levelSelect.value === levelId) {
            currentSet = 1;
            console.log(`Current set reset to 1 because initialized level ${levelId} was active.`);
            // Restart the quiz for the cleared level
            await startNewQuiz();
        }
        hideLoading();
        alert(`レベル「${levelId}」の学習データが初期化されました。`);
        return true; // Indicate success

    } catch (error) {
        console.error(`Error initializing level ${levelId}:`, error);
        displayError(`レベル「${levelId}」の初期化に失敗しました。`, false);
        hideLoading();
        return false; // Indicate failure
    }
}

// --- Main Initialization Logic ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM fully loaded and parsed.");

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
        menuItemHistory, menuItemRemaining, menuItemInitialize, menuItemRestore, menuItemLogout, userDisplay, historyModal, remainingModal, historyDetailModal
        // Add more as needed, e.g., loadingIndicator, endMessageElement
    };
    const missingElements = Object.entries(essentialElements)
                              .filter(([name, element]) => !element)
                              .map(([name]) => name);

    if (missingElements.length > 0) {
        const missingList = missingElements.join(', ');
        console.error(`初期化エラー: 必須のDOM要素への参照を取得できません: ${missingList}`);
        alert(`ページの読み込みに失敗しました。必須要素 (${missingList}) が見つかりません。`);
        // Optionally hide main content
        if(quizContainer) quizContainer.innerHTML = '<p style="color:red;">エラー: ページを正しく読み込めませんでした。</p>';
        return; // Stop further execution
    }
    console.log("Essential DOM element check passed.");

    // 3. Header Bubble Logic (Requires minguoDateString calculation)
    let minguoDateString = '';
    try {
        const today = new Date(); const year = today.getFullYear();
        const month = (today.getMonth() + 1).toString().padStart(2, '0'); const day = today.getDate().toString().padStart(2, '0');
        const taiwaneseWeekdays = ["日", "一", "二", "三", "四", "五", "六"];
        minguoDateString = `民國 ${year - 1911}年${month}月${day}日 (${taiwaneseWeekdays[today.getDay()]})`;
    } catch(e) { console.error("Error calculating date for bubble:", e); }
    const headerElephantIcon = document.getElementById('header-elephant-icon'); // Can be local
    const headerSpeechBubble = document.getElementById('header-speech-bubble'); // Can be local
    let bubbleTimeoutId = null;
    if (headerElephantIcon && headerSpeechBubble) {
        // Set initial text content but keep it hidden initially
        headerSpeechBubble.textContent = `今日は${minguoDateString || '...'}だゾウ！`;
        headerSpeechBubble.classList.remove('visible'); // Ensure hidden

        headerElephantIcon.addEventListener('click', () => {
             if (headerSpeechBubble.classList.contains('visible')) {
                 headerSpeechBubble.classList.remove('visible');
                 if (bubbleTimeoutId) clearTimeout(bubbleTimeoutId);
             } else {
                 // Text is already set, just make visible
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
    // Header Menu
    if (headerMenuButton && headerMenuDropdown) {
        headerMenuButton.addEventListener('click', (event) => {
            event.stopPropagation(); // Prevent click from immediately closing menu via document listener
            headerMenuDropdown.classList.toggle('hidden');
            console.log(`DEBUG: Header menu button clicked. Dropdown hidden: ${headerMenuDropdown.classList.contains('hidden')}`); // Log toggle state
        });
        document.addEventListener('click', (event) => {
            // Check if the dropdown exists and is NOT hidden
            if (headerMenuDropdown && !headerMenuDropdown.classList.contains('hidden')) {
                // Check if the click target is NOT the dropdown itself or a descendant AND NOT the button itself
                 if (!headerMenuDropdown.contains(event.target) && event.target !== headerMenuButton) {
                    console.log("DEBUG: Clicked outside menu, closing."); // Log closing action
                    headerMenuDropdown.classList.add('hidden');
                } else {
                     console.log("DEBUG: Clicked inside menu or on button, not closing."); // Log non-closing action
                 }
            }
        });
        console.log("Header menu listeners attached.");
    } else {
        console.error("Could not attach header menu listeners: Button or Dropdown element missing.");
    }

    // Menu Item: History
    if (menuItemHistory) {
        menuItemHistory.addEventListener('click', () => {
            console.log("DEBUG: History menu item clicked.");
            populateHistoryModal();
            console.log("DEBUG: Opening history modal..."); // Log before open
            openModal(historyModal);
            if (headerMenuDropdown) headerMenuDropdown.classList.add('hidden');
        });
        console.log("History menu listener attached.");
    } else { console.error("History menu item not found."); }

    // Menu Item: Remaining Words
    if (menuItemRemaining) {
        menuItemRemaining.addEventListener('click', () => {
            console.log("DEBUG: Remaining words menu item clicked.");
            // Simplified logic for debugging
            if (isLoadingProgress || !currentUserId || allWordsInLevel.length === 0) {
                 console.log("DEBUG: Remaining words - Cannot populate yet (loading/no user/no words)");
                 // Maybe show a message?
            } else {
                 populateRemainingModal();
                 console.log("DEBUG: Opening remaining words modal..."); // Log before open
                 openModal(remainingModal);
            }
            if (headerMenuDropdown) headerMenuDropdown.classList.add('hidden');
        });
        console.log("Remaining words menu listener attached.");
    } else { console.error("Remaining words menu item not found."); }

    // Menu Item: Initialize
    if (menuItemInitialize) {
        menuItemInitialize.addEventListener('click', async () => {
            console.log("DEBUG: Initialize menu item clicked.");
            if (headerMenuDropdown) headerMenuDropdown.classList.add('hidden');
            if (!currentUserId || !levelSelect) return; // Should not happen if logged in
            
            const levelToInitialize = levelSelect.value;
            const levelNameToInitialize = levelSelect.options[levelSelect.selectedIndex].text;

            if (confirm(`レベル「${levelNameToInitialize}」の学習データを完全に削除して初期化します。よろしいですか？`)) {
                await initializeLevelProgress(levelToInitialize);
            }
        });
        console.log("Initialize menu listener attached.");
    } else { console.error("Initialize menu item not found."); }

    // Menu Item: Restore
    if (menuItemRestore) {
        menuItemRestore.addEventListener('click', () => {
            console.log("DEBUG: Restore menu item clicked.");
            if (headerMenuDropdown) headerMenuDropdown.classList.add('hidden');
            if (!currentUserId) {
                displayError("ログインしていません。", false);
                return;
            }
            console.log("Manual restore triggered. Reloading progress from Firestore...");
            // Just call loadProgressFromFirestore, it will handle loading and restarting quiz
            loadProgressFromFirestore(currentUserId);
        });
        console.log("Restore menu listener attached.");
    } else { console.error("Restore menu item not found."); }

    // Menu Item: Logout
    if (menuItemLogout) {
        menuItemLogout.addEventListener('click', () => {
            console.log("DEBUG: Logout menu item clicked.");
            if (headerMenuDropdown) headerMenuDropdown.classList.add('hidden');
            console.log("DEBUG: Calling auth.signOut()..."); // Log before signout
            auth.signOut().then(() => {
                console.log('User signed out successfully via button.');
            }).catch((error) => {
                console.error('Sign out error on button click:', error);
            });
        });
        console.log("Logout menu listener attached.");
    } else { console.error("Logout menu item not found."); }

    // Modals Close/Background Click
    if (closeHistoryModalButton) closeHistoryModalButton.addEventListener('click', () => { console.log("DEBUG: Close history button clicked."); closeModal(historyModal); });
    if (closeRemainingModalButton) closeRemainingModalButton.addEventListener('click', () => { console.log("DEBUG: Close remaining button clicked."); closeModal(remainingModal); });
    if (closeHistoryDetailModalButton) closeHistoryDetailModalButton.addEventListener('click', () => { console.log("DEBUG: Close history detail button clicked."); closeModal(historyDetailModal); });
    if (historyModal) historyModal.addEventListener('click', (e) => { if (e.target === historyModal) { console.log("DEBUG: History modal background clicked."); closeModal(historyModal); } });
    if (remainingModal) remainingModal.addEventListener('click', (e) => { if (e.target === remainingModal) { console.log("DEBUG: Remaining modal background clicked."); closeModal(remainingModal); } });
    if (historyDetailModal) historyDetailModal.addEventListener('click', (e) => { if (e.target === historyDetailModal) { console.log("DEBUG: History detail modal background clicked."); closeModal(historyDetailModal); } });
    console.log("Modal listeners attached.");

    // History List Item Click Listener
    if (historyList) {
        historyList.addEventListener('click', (event) => {
            console.log("DEBUG: Click detected on history list area.");
            const listItem = event.target.closest('li.history-item-clickable');
            if (listItem && listItem.dataset.historyIndex !== undefined) {
                console.log("DEBUG: Clickable history item found. Index:", listItem.dataset.historyIndex);
                const displayIndex = parseInt(listItem.dataset.historyIndex, 10);
                const currentLevelId = levelSelect.value;
                
                const levelData = userLevelProgress[currentLevelId];
                const history = levelData?.history || [];

                // Define sortedHistory HERE, before using it in the condition
                const sortedHistory = [...history].sort((a, b) => {
                    const dateA = a.date?.toDate ? a.date.toDate() : new Date(a.date);
                    const dateB = b.date?.toDate ? b.date.toDate() : new Date(b.date);
                    return dateB - dateA; // Descending order
                });

                // Check if the entry exists in the sorted array
                if (sortedHistory[displayIndex]) {
                    const historyEntry = sortedHistory[displayIndex];
                    console.log("DEBUG: Retrieving entry from sorted history for display index:", displayIndex, "Entry:", JSON.parse(JSON.stringify(historyEntry || null)));
                    populateHistoryDetailModal(historyEntry);
                    console.log("DEBUG: Opening history detail modal...");
                    openModal(historyDetailModal);
                } else {
                    console.error('Could not find history data for display index:', displayIndex);
                }
            } else {
                 console.log("DEBUG: Clicked item is not a clickable history entry or index is missing.");
             }
        });
        console.log("History list listener attached.");
    } else { console.error("History list element not found."); }

    // Level Select
    if (levelSelect) {
        levelSelect.addEventListener('change', async (event) => {
            const newLevelId = event.target.value;
            console.log(`DEBUG: Level select changed. New value selected: ${newLevelId}`);
            if (isLoadingProgress || !currentUserId) {
                 console.log("DEBUG: Level change ignored (loading or no user).");
                 return;
            }

            // --- Set flag to clear delayed carry-overs ---
            levelChangedFlag = true; 
            // -------------------------------------

            const levelData = userLevelProgress[newLevelId] || { lastCompletedSet: 0 };
            currentSet = (levelData.lastCompletedSet || 0) + 1;
            console.log(`DEBUG: Level change - Setting starting set for new level ${newLevelId} to: ${currentSet}`);
            allWordsInLevel = []; // Clear word list for new level
            currentLevelTotalWords = 0;
            console.log(`DEBUG: Level change - About to call startNewQuiz for level: ${newLevelId}`);
            await startNewQuiz(); // This will clear delayedCarryOverWords due to the flag
            saveLastUsedLevel(newLevelId);
        });
        console.log("Level select listener attached.");
    } else { console.error("Level select element not found."); }

    // Quiz Buttons
    if (nextQuizButton) {
        nextQuizButton.addEventListener('click', nextQuiz);
        console.log("Quiz button listeners attached.");
    } else { console.error("Next quiz button not found."); }
    if (prevQuizButton) {
        prevQuizButton.addEventListener('click', prevQuiz);
        console.log("Quiz button listeners attached.");
    } else { console.error("Previous quiz button not found."); }
    if (checkAnswersButton) {
        checkAnswersButton.addEventListener('click', checkAnswers);
        console.log("Quiz button listeners attached.");
    } else { console.error("Check answers button not found."); }
    if (resultsNextSetButton) {
        resultsNextSetButton.addEventListener('click', () => {
            currentSet++;
            startNewQuiz();
        });
        console.log("Quiz button listeners attached.");
    } else { console.error("Results next set button not found."); }
    if (retrySetButton) {
        retrySetButton.addEventListener('click', retryCurrentSet);
        console.log("Quiz button listeners attached.");
    } else { console.error("Retry set button not found."); }

    // Answer Input Enter Key
    if (answerInputElement) {
        answerInputElement.addEventListener('keypress', (event) => {
            console.log("Answer input listener attached.");
            // ... (enter key logic)
        });
        console.log("Answer input listener attached.");
    } else { console.error("Answer input element not found."); }

    console.log("All planned event listeners attached.");

    // 5. Initial UI State (Before Auth Check)
    console.log("Setting initial UI state...");
    if (checkAnswersButton) checkAnswersButton.classList.add('hidden');
    if (resultsContainer) resultsContainer.classList.add('hidden');
    if (retrySetButton) retrySetButton.classList.add('hidden');
    if (resultsNextSetButton) resultsNextSetButton.classList.add('hidden');
    if (setStartMessageElement) setStartMessageElement.classList.add('hidden');
    if (progressBar) progressBar.classList.add('hidden');
    if (levelSelect) levelSelect.disabled = true; // Disable until progress loads
    console.log("Initial UI state set.");

    // 6. Setup Authentication Listener (Triggers data load and initial quiz)
    console.log("Setting up Firebase Auth listener...");
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            // Prevent redundant actions on token refresh if userId hasn't changed
            if (currentUserId === user.uid) {
                // console.log("Auth State Changed: User already signed in, no action needed."); // Can be noisy
                return; 
            }

            currentUserId = user.uid;
            console.log("Auth State Changed: User is signed in:", currentUserId);
            displayUserEmail(user.email);

            // --- Load last used level BEFORE loading progress ---
            let initialLevelId = 'novice_1'; // Default level
            const userSettingsRef = doc(db, "users", currentUserId);
            try {
                console.log("Attempting to load last used level...");
                const userSettingsSnap = await getDoc(userSettingsRef);
                if (userSettingsSnap.exists() && userSettingsSnap.data()?.lastUsedLevel) {
                    const loadedLevel = userSettingsSnap.data().lastUsedLevel;
                    // Validate if the loaded level exists in the dropdown
                    if (levelSelect && Array.from(levelSelect.options).some(option => option.value === loadedLevel)) {
                         initialLevelId = loadedLevel;
                         console.log(`Last used level loaded: ${initialLevelId}`);
                    } else {
                         console.warn(`Loaded level '${loadedLevel}' not found in dropdown, using default.`);
                    }
                } else {
                    console.log("No last used level found in Firestore, using default.");
                }
            } catch (error) {
                console.error("Error loading last used level:", error);
                // Proceed with default level in case of error
            }

            // Set the level select dropdown value
            if (levelSelect) {
                levelSelect.value = initialLevelId;
                console.log(`Level select dropdown set to: ${initialLevelId}`);
            } else {
                console.error("Cannot set initial level: levelSelect element not found!");
            }
            // --- End Load last used level ---

            // Now load progress for the (potentially pre-selected) level
            loadProgressFromFirestore(currentUserId);

        } else {
            if (currentUserId !== null) { // Only trigger if state changes to signed out
                 currentUserId = null;
                 userLevelProgress = {};
                 isLoadingProgress = false;
                 console.log("Auth State Changed: User is signed out.");
                 clearUIForSignedOutUser();
                 window.location.href = 'login.html';
            } else {
                 // console.log("Auth State Changed: Already signed out.");
                 // If already null, maybe redirect just in case?
                 // Ensure we are not already on login page to avoid redirect loop
                 if (window.location.pathname !== '/login.html' && window.location.pathname !== '/login') {
                     console.log("Redirecting to login page as user is null and not on login page.");
                     window.location.href = 'login.html';
                 }
            }
        }
    });
    console.log("Firebase Auth listener is active.");

}); // --- End of DOMContentLoaded --- 