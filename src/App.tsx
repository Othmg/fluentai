import React, { useState, useEffect } from 'react';
import { BookOpen, GraduationCap, MessageSquare, CheckCircle2, XCircle, List, UserCircle, LogOut } from 'lucide-react';
import { Auth } from './components/Auth';
import { supabase } from './lib/supabase';
import type { User } from '@supabase/supabase-js';

interface FormData {
  targetLanguage: string;
  proficiencyLevel: string;
  interests: string;
}

interface Exercise {
  question: string;
  type: 'multiple-choice' | 'fill-in-the-blank' | 'translation';
  options?: string[];
  correct_answer: string;
  explanation: string;
}

interface VocabularyItem {
  word: string;
  translation: string;
  example_sentence: string;
  exercises: Exercise[];
}

interface Grammar {
  topic: string;
  explanation: string;
  exercises: Exercise[];
}

interface Lesson {
  title: string;
  level: string;
  language: string;
  topic: string;
  overview: string;
  vocabulary: VocabularyItem[];
  grammar: Grammar;
}

interface AIResponse {
  lesson: Lesson;
}

function VocabularyList({ vocabulary }: { vocabulary: VocabularyItem[] }) {
  return (
    <div className="bg-white p-4 sm:p-6 rounded-xl shadow-lg mb-6 sm:mb-8">
      <div className="flex items-center gap-2 mb-4">
        <List className="w-5 h-5 text-blue-600 flex-shrink-0" />
        <h3 className="text-lg sm:text-xl font-semibold">Vocabulary Overview</h3>
      </div>
      <div className="divide-y divide-gray-100">
        {vocabulary.map((item, index) => (
          <div key={index} className="py-3 sm:py-4">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <h4 className="text-base sm:text-lg font-medium text-gray-900">{item.word}</h4>
                <p className="text-sm sm:text-base text-gray-500 italic">{item.example_sentence}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ExerciseComponent({ exercise, onNext }: { exercise: Exercise; onNext: () => void }) {
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [userInput, setUserInput] = useState('');

  const isCorrect = selectedAnswer === exercise.correct_answer || userInput.toLowerCase() === exercise.correct_answer.toLowerCase();

  const handleAnswer = (answer: string) => {
    if (!showExplanation) {
      setSelectedAnswer(answer);
      setShowExplanation(true);
    }
  };

  const handleInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!showExplanation) {
      setShowExplanation(true);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-base sm:text-lg font-semibold mb-4">{exercise.question}</h3>

      {exercise.type === 'multiple-choice' && exercise.options && (
        <div className="space-y-2 sm:space-y-3">
          {exercise.options.map((option, index) => (
            <button
              key={index}
              onClick={() => handleAnswer(option)}
              disabled={showExplanation}
              className={`w-full text-left p-3 rounded-lg border transition-colors ${
                selectedAnswer === option
                  ? isCorrect
                    ? 'bg-green-50 border-green-500'
                    : 'bg-red-50 border-red-500'
                  : 'border-gray-300 hover:border-blue-500'
              } ${showExplanation ? 'cursor-default' : 'hover:bg-gray-50'} text-sm sm:text-base`}
              type="button"
            >
              <div className="flex items-center">
                {selectedAnswer === option && (
                  isCorrect 
                    ? <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 mr-2 flex-shrink-0" />
                    : <XCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-500 mr-2 flex-shrink-0" />
                )}
                {option}
              </div>
            </button>
          ))}
        </div>
      )}

      {(exercise.type === 'fill-in-the-blank' || exercise.type === 'translation') && (
        <form onSubmit={handleInputSubmit} className="space-y-3 sm:space-y-4">
          <input
            type="text"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            disabled={showExplanation}
            className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
            placeholder="Type your answer here..."
            autoComplete="off"
            spellCheck="false"
          />
          {!showExplanation && (
            <button
              type="submit"
              className="w-full sm:w-auto px-4 py-2 text-sm sm:text-base bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Check Answer
            </button>
          )}
        </form>
      )}

      {showExplanation && (
        <div className={`mt-4 p-3 sm:p-4 rounded-lg ${
          isCorrect ? 'bg-green-50' : 'bg-red-50'
        }`}>
          <p className="text-sm sm:text-base text-gray-800 mb-4">{exercise.explanation}</p>
          <button
            onClick={onNext}
            className="w-full sm:w-auto px-4 py-2 text-sm sm:text-base bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Next Exercise
          </button>
        </div>
      )}
    </div>
  );
}

function LessonContent({ response }: { response: AIResponse }) {
  const [currentVocabIndex, setCurrentVocabIndex] = useState(0);
  const [currentVocabExerciseIndex, setCurrentVocabExerciseIndex] = useState(0);
  const [currentGrammarExerciseIndex, setCurrentGrammarExerciseIndex] = useState(0);
  const [activeSection, setActiveSection] = useState<'vocabulary' | 'grammar'>('vocabulary');

  const currentVocabWord = response.lesson.vocabulary[currentVocabIndex];
  const currentVocabExercise = currentVocabWord.exercises[currentVocabExerciseIndex];
  const currentGrammarExercise = response.lesson.grammar.exercises[currentGrammarExerciseIndex];

  const handleNextVocabExercise = () => {
    if (currentVocabExerciseIndex < currentVocabWord.exercises.length - 1) {
      setCurrentVocabExerciseIndex(prev => prev + 1);
    } else if (currentVocabIndex < response.lesson.vocabulary.length - 1) {
      setCurrentVocabIndex(prev => prev + 1);
      setCurrentVocabExerciseIndex(0);
    }
  };

  const handleNextGrammarExercise = () => {
    if (currentGrammarExerciseIndex < response.lesson.grammar.exercises.length - 1) {
      setCurrentGrammarExerciseIndex(prev => prev + 1);
    }
  };

  return (
    <div className="mt-6 sm:mt-8 space-y-6 sm:space-y-8">
      <section className="bg-white p-4 sm:p-6 rounded-xl shadow-lg">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4">{response.lesson.title}</h2>
        <p className="text-sm sm:text-base text-gray-600">{response.lesson.overview}</p>
      </section>

      <VocabularyList vocabulary={response.lesson.vocabulary} />

      <div className="flex border-b border-gray-200 overflow-x-auto">
        <button
          onClick={() => setActiveSection('vocabulary')}
          className={`px-3 sm:px-4 py-2 text-sm sm:text-base font-medium whitespace-nowrap ${
            activeSection === 'vocabulary'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Practice Vocabulary
        </button>
        <button
          onClick={() => setActiveSection('grammar')}
          className={`px-3 sm:px-4 py-2 text-sm sm:text-base font-medium whitespace-nowrap ${
            activeSection === 'grammar'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Practice Grammar
        </button>
      </div>

      {activeSection === 'vocabulary' ? (
        <section className="bg-white p-4 sm:p-6 rounded-xl shadow-lg">
          <div className="mb-4 sm:mb-6">
            <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-2">{currentVocabWord.word}</h3>
            <p className="text-sm sm:text-base text-gray-600 italic">{currentVocabWord.example_sentence}</p>
          </div>
          
          <div className="mt-4 sm:mt-6">
            <ExerciseComponent
              exercise={currentVocabExercise}
              onNext={handleNextVocabExercise}
            />
          </div>
        </section>
      ) : (
        <section className="bg-white p-4 sm:p-6 rounded-xl shadow-lg">
          <div className="mb-4 sm:mb-6">
            <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-2">{response.lesson.grammar.topic}</h3>
            <p className="text-sm sm:text-base text-gray-600">{response.lesson.grammar.explanation}</p>
          </div>
          
          <div className="mt-4 sm:mt-6">
            <ExerciseComponent
              exercise={currentGrammarExercise}
              onNext={handleNextGrammarExercise}
            />
          </div>
        </section>
      )}
    </div>
  );
}

function App() {
  const [formData, setFormData] = useState<FormData>({
    targetLanguage: '',
    proficiencyLevel: '',
    interests: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<AIResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    if (supabase) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        setUser(session?.user ?? null);
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user ?? null);
      });

      return () => subscription.unsubscribe();
    }
  }, []);

  const handleSignOut = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/openai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: `Create a personalized language learning plan for a ${formData.proficiencyLevel} level student learning ${formData.targetLanguage}. They are interested in ${formData.interests}.`
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate learning plan');
      }

      const jsonResponse = await response.json();
      setResponse(JSON.parse(jsonResponse) as AIResponse);
    } catch (err) {
      console.error('Error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#007CF0]/5 via-white to-[#00DFD8]/5 pb-6 sm:pb-12">
      <div className="max-w-4xl mx-auto pt-8 sm:pt-16 px-4">
        <div className="flex justify-between items-center mb-6 sm:mb-12">
          <div className="flex-1">
            <div className="flex justify-center">
              <a href="https://www.hellofluentai.com" target="_blank" rel="noopener noreferrer" className="inline-block">
                <svg width="280" height="52" viewBox="0 0 419 77" fill="none" xmlns="http://www.w3.org/2000/svg" className="transform hover:scale-105 transition-transform duration-300">
                  <path d="M15.877 76H0.984375V4.61328H41.9023V17.0156H15.877V35.4238H40.0957V47.7773H15.877V76ZM71.5879 76H56.6953V0.0234375H71.5879V76ZM139.359 21.4102V76H127.934L125.932 69.0176H125.15C123.979 70.873 122.514 72.3867 120.756 73.5586C118.998 74.7305 117.061 75.5931 114.945 76.1465C112.829 76.6999 110.632 76.9766 108.354 76.9766C104.447 76.9766 101.046 76.293 98.1484 74.9258C95.2513 73.526 92.9889 71.3613 91.3613 68.4316C89.7663 65.502 88.9688 61.6934 88.9688 57.0059V21.4102H103.861V53.2949C103.861 57.2012 104.561 60.1471 105.961 62.1328C107.361 64.1185 109.59 65.1113 112.65 65.1113C115.678 65.1113 118.054 64.4277 119.779 63.0605C121.505 61.6608 122.709 59.6263 123.393 56.957C124.109 54.2552 124.467 50.9674 124.467 47.0938V21.4102H139.359ZM179.494 20.3848C184.54 20.3848 188.885 21.3613 192.531 23.3145C196.177 25.235 198.993 28.0345 200.979 31.7129C202.964 35.3913 203.957 39.8835 203.957 45.1895V52.416H168.752C168.915 56.6152 170.168 59.9193 172.512 62.3281C174.888 64.7044 178.176 65.8926 182.375 65.8926C185.858 65.8926 189.048 65.5345 191.945 64.8184C194.842 64.1022 197.821 63.028 200.881 61.5957V73.1191C198.179 74.4538 195.347 75.4303 192.385 76.0488C189.455 76.6673 185.891 76.9766 181.691 76.9766C176.223 76.9766 171.372 75.9674 167.141 73.9492C162.941 71.931 159.637 68.8548 157.229 64.7207C154.852 60.5866 153.664 55.3783 153.664 49.0957C153.664 42.7155 154.738 37.4095 156.887 33.1777C159.068 28.9134 162.095 25.7233 165.969 23.6074C169.842 21.459 174.351 20.3848 179.494 20.3848ZM179.592 30.9805C176.695 30.9805 174.286 31.9082 172.365 33.7637C170.477 35.6191 169.387 38.5326 169.094 42.5039H189.992C189.96 40.2904 189.553 38.321 188.771 36.5957C188.023 34.8704 186.883 33.5033 185.354 32.4941C183.856 31.485 181.936 30.9805 179.592 30.9805ZM249.072 20.3848C254.899 20.3848 259.587 21.9798 263.135 25.1699C266.683 28.3275 268.457 33.4056 268.457 40.4043V76H253.564V44.1152C253.564 40.209 252.848 37.263 251.416 35.2773C250.016 33.2917 247.803 32.2988 244.775 32.2988C240.218 32.2988 237.109 33.8451 235.449 36.9375C233.789 40.0299 232.959 44.4896 232.959 50.3164V76H218.066V21.4102H229.443L231.445 28.3926H232.275C233.447 26.5046 234.896 24.9746 236.621 23.8027C238.379 22.6309 240.316 21.7682 242.432 21.2148C244.58 20.6615 246.794 20.3848 249.072 20.3848ZM308.787 65.1113C310.415 65.1113 311.993 64.9486 313.523 64.623C315.086 64.2975 316.632 63.8906 318.162 63.4023V74.4863C316.567 75.2025 314.581 75.7884 312.205 76.2441C309.861 76.7324 307.29 76.9766 304.49 76.9766C301.235 76.9766 298.305 76.4557 295.701 75.4141C293.13 74.3398 291.095 72.5007 289.598 69.8965C288.133 67.2598 287.4 63.5977 287.4 58.9102V32.5918H280.271V26.293L288.475 21.3125L292.771 9.78906H302.293V21.4102H317.576V32.5918H302.293V58.9102C302.293 60.9935 302.879 62.556 304.051 63.5977C305.255 64.6068 306.834 65.1113 308.787 65.1113ZM376.119 76L370.943 59.0078H344.918L339.742 76H323.434L348.629 4.32031H367.135L392.428 76H376.119ZM367.33 46.3125L362.154 29.7109C361.829 28.6042 361.389 27.1882 360.836 25.4629C360.315 23.7051 359.778 21.931 359.225 20.1406C358.704 18.3177 358.281 16.7389 357.955 15.4043C357.63 16.7389 357.174 18.3991 356.588 20.3848C356.035 22.3379 355.497 24.1934 354.977 25.9512C354.456 27.709 354.081 28.9622 353.854 29.7109L348.727 46.3125H367.33ZM403.461 76V4.61328H418.598V76H403.461Z" fill="url(#paint0_linear_129_101)"/>
                  <defs>
                    <linearGradient id="paint0_linear_129_101" x1="-15.7607" y1="25.518" x2="435.894" y2="25.518" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#007CF0"/>
                      <stop offset="1" stopColor="#00DFD8"/>
                    </linearGradient>
                  </defs>
                </svg>
              </a>
            </div>
            <p className="text-sm sm:text-lg text-gray-600 text-center mt-4">
              Get personalized language lessons tailored to your needs
            </p>
          </div>
          <div className="flex items-center gap-2">
            {supabase && (user ? (
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600">{user.email}</span>
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowAuth(true)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                <UserCircle className="w-5 h-5" />
                Sign In
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6 bg-white p-4 sm:p-8 rounded-xl shadow-lg">
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 p-3 sm:p-4 bg-blue-50 rounded-lg">
              <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 flex-shrink-0" />
              <div className="flex-1 w-full">
                <label htmlFor="targetLanguage" className="block text-sm font-medium text-gray-700 mb-1">
                  Which language do you want to learn?
                </label>
                <input
                  type="text"
                  id="targetLanguage"
                  name="targetLanguage"
                  value={formData.targetLanguage}
                  onChange={handleChange}
                  className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., Spanish, French, Japanese"
                  required
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 p-3 sm:p-4 bg-green-50 rounded-lg">
              <GraduationCap className="w-5 h-5 sm:w-6 sm:h-6 text-green-600 flex-shrink-0" />
              <div className="flex-1 w-full">
                <label htmlFor="proficiencyLevel" className="block text-sm font-medium text-gray-700 mb-1">
                  Your current proficiency level
                </label>
                <select
                  id="proficiencyLevel"
                  name="proficiencyLevel"
                  value={formData.proficiencyLevel}
                  onChange={handleChange}
                  className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  required
                >
                  <option value="">Select your level</option>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 p-3 sm:p-4 bg-purple-50 rounded-lg">
              <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600 flex-shrink-0" />
              <div className="flex-1 w-full">
                <label htmlFor="interests" className="block text-sm font-medium text-gray-700 mb-1">
                  Topics of interest
                </label>
                <input
                  type="text"
                  id="interests"
                  name="interests"
                  value={formData.interests}
                  onChange={handleChange}
                  className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="e.g., business, travel, culture, music"
                  required
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="p-3 sm:p-4 bg-red-50 text-red-700 rounded-lg text-sm sm:text-base">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2 sm:py-3 px-4 text-sm sm:text-base border border-transparent rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Generating your plan...' : 'Generate Learning Plan'}
          </button>
        </form>

        {response && <LessonContent response={response} />}
        {showAuth && supabase && <Auth onClose={() => setShowAuth(false)} />}
      </div>
    </div>
  );
}

export default App;