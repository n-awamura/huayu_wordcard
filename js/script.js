// template/js/common.js
// Add common JavaScript functions here in the future.

document.addEventListener('DOMContentLoaded', () => {
    const card = document.querySelector('.card');
    const cardFront = document.querySelector('.card-front');
    const cardBack = document.querySelector('.card-back');
    const definitionElement = cardFront.querySelector('.definition');
    const wordElement = cardBack.querySelector('.word');
    const pinyinElement = cardBack.querySelector('.pinyin');

    const prevButton = document.getElementById('prev-button');
    const flipButton = document.getElementById('flip-button');
    const nextButton = document.getElementById('next-button');

    let words = [];
    let currentWordIndex = 0;
    let isFlipped = false;

    // Fetch word data from JSON
    async function loadWords() {
        try {
            // Adjust the path based on your file structure
            const response = await fetch('wordcard_data/novice_1.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            words = await response.json();
            console.log("Words loaded:", words);
            if (words.length > 0) {
                displayWord(currentWordIndex);
            } else {
                console.error("No words found in the JSON file.");
                // Display a message to the user if needed
            }
        } catch (error) {
            console.error('Error loading word data:', error);
            // Display an error message to the user
            pinyinElement.textContent = 'エラー';
            wordElement.textContent = '単語データの読み込みに失敗しました';
        }
    }

    // Display the current word
    function displayWord(index) {
        if (index >= 0 && index < words.length) {
            const wordData = words[index];
            wordElement.textContent = wordData.語彙 || 'N/A';
            definitionElement.textContent = wordData.和訳 || 'N/A';
            pinyinElement.textContent = wordData.拼音 || 'N/A';

            // Reset flip state when showing a new word
            if (isFlipped) {
                card.classList.remove('flipped');
                isFlipped = false;
            }
        } else {
            console.error("Invalid word index:", index);
        }
    }

    // Flip the card
    function flipCard() {
        card.classList.toggle('flipped');
        isFlipped = !isFlipped;
    }

    // Show the next word
    function nextWord() {
        currentWordIndex = (currentWordIndex + 1) % words.length; // Loop back to the start
        displayWord(currentWordIndex);
    }

    // Show the previous word
    function prevWord() {
        currentWordIndex = (currentWordIndex - 1 + words.length) % words.length; // Loop back to the end
        displayWord(currentWordIndex);
    }

    // Add event listeners
    flipButton.addEventListener('click', flipCard);
    nextButton.addEventListener('click', nextWord);
    prevButton.addEventListener('click', prevWord);

    // Load words when the page is ready
    loadWords();
}); 