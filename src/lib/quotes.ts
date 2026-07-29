export const DAILY_QUOTES = [
  { quote: "Success is the sum of small efforts repeated day in and day out.", author: "Robert Collier" },
  { quote: "The expert in anything was once a beginner.", author: "Helen Hayes" },
  { quote: "The future depends on what you do today.", author: "Mahatma Gandhi" },
  { quote: "Hard work beats talent when talent doesn't work hard.", author: "Tim Notke" },
  { quote: "Discipline is the bridge between goals and accomplishment.", author: "Jim Rohn" },
  { quote: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { quote: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
  { quote: "Don't stop when you're tired. Stop when you're done.", author: "Unknown" },
  { quote: "The chapter you study today can become tomorrow's rank booster.", author: "Unknown" },
  { quote: "Consistency beats motivation.", author: "Unknown" },
  { quote: "Wake up with determination. Go to bed with satisfaction.", author: "Unknown" },
  { quote: "Do something today that your future self will thank you for.", author: "Unknown" },
  { quote: "Small progress every day adds up to big results.", author: "Unknown" },
  { quote: "Your only limit is the one you set yourself.", author: "Unknown" },
  { quote: "Push yourself, because no one else is going to do it for you.", author: "Unknown" },
  { quote: "The pain of discipline weighs ounces, but the pain of regret weighs tons.", author: "Jim Rohn" },
  { quote: "Dreams don't work unless you do.", author: "John C. Maxwell" },
  { quote: "Today's effort is tomorrow's result.", author: "Unknown" },
]

export function getDailyQuote() {
  const day = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000)
  return DAILY_QUOTES[day % DAILY_QUOTES.length]
}

export function getRandomQuote() {
  return DAILY_QUOTES[Math.floor(Math.random() * DAILY_QUOTES.length)]
}
