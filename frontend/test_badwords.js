
import { containsBadWord } from './src/utils/badWords.js';

const testCases = [
    "This is clean",
    "This is shit",
    "fuck this",
    "Hello world",
    "Asshole behavior"
];

testCases.forEach(text => {
    console.log(`'${text}': ${containsBadWord(text)}`);
});
