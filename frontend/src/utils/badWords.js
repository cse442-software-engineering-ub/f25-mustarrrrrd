
const BAD_WORDS = [
    "shit",
    "fuck",
    "bitch",
    "ass",
    "asshole",
    "bastard",
    "damn",
    "crap",
    "piss",
    "dick",
    "cock",
    "pussy",
    "slut",
    "whore",
    "cunt"
];

export function containsBadWord(text) {
    if (!text) return false;
    const lowerText = text.toLowerCase();
    return BAD_WORDS.some(word => lowerText.includes(word));
}
