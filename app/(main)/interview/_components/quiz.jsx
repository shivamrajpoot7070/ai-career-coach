"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { generateQuiz, saveQuizResult } from "@/actions/interview";
import QuizResult from "./quiz-result";
import useFetch from "@/hooks/use-fetch";
import { BarLoader } from "react-spinners";

export default function Quiz() {
  const [topic, setTopic] = useState("");
  const [quizStarted, setQuizStarted] = useState(false);

  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [showExplanation, setShowExplanation] = useState(false);

  /* ---------------------------
     Generate Quiz Hook
  ---------------------------- */
  const {
    loading: generatingQuiz,
    fn: generateQuizFn,
    data: quizData,
  } = useFetch(generateQuiz);

  /* ---------------------------
     Save Result Hook
  ---------------------------- */
  const {
    loading: savingResult,
    fn: saveQuizResultFn,
    data: resultData,
    setData: setResultData,
  } = useFetch(saveQuizResult);

  /* ---------------------------
     Initialize answers
  ---------------------------- */
  useEffect(() => {
    if (quizData) {
      setAnswers(new Array(quizData.length).fill(null));
    }
  }, [quizData]);

  /* ---------------------------
     Topic Form (FIRST SCREEN)
  ---------------------------- */
  if (!quizStarted && !quizData) {
    return (
      <Card className="mx-2 max-w-xl mx-auto">
        <CardHeader>
          <CardTitle>Start Practice Quiz</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Enter a topic you want to practice.
            <br />
            <span className="italic">
              Example: Binary Trees, React Hooks, Dynamic Programming
            </span>
          </p>

          <input
            type="text"
            placeholder="Enter topic..."
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            className="
              w-full border rounded-md px-3 py-2
              focus:outline-none focus:ring-2 focus:ring-primary/40
            "
          />
        </CardContent>

        <CardFooter>
          <Button
            className="w-full"
            disabled={topic.trim().length < 3 || generatingQuiz}
            onClick={() => {
              generateQuizFn(topic);
              setQuizStarted(true);
            }}
          >
            Start Quiz
          </Button>
        </CardFooter>
      </Card>
    );
  }

  /* ---------------------------
     Loading Quiz
  ---------------------------- */
  if (generatingQuiz) {
    return <BarLoader className="mt-4" width="100%" color="gray" />;
  }

  /* ---------------------------
     Quiz Result
  ---------------------------- */
  if (resultData) {
    return (
      <div className="mx-2">
        <QuizResult
          result={resultData}
          onStartNew={() => {
            setTopic("");
            setQuizStarted(false);
            setCurrentQuestion(0);
            setAnswers([]);
            setShowExplanation(false);
            setResultData(null);
          }}
        />
      </div>
    );
  }

  /* ---------------------------
     Saving Result Loader
  ---------------------------- */
  if (savingResult) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <BarLoader width={200} color="gray" />
        <p className="mt-4 text-lg text-muted-foreground">
          Generating your results...
        </p>
      </div>
    );
  }

  /* ---------------------------
     Quiz Logic
  ---------------------------- */
  const question = quizData[currentQuestion];

  const handleAnswer = (answer) => {
    const newAnswers = [...answers];
    newAnswers[currentQuestion] = answer;
    setAnswers(newAnswers);
  };

  const calculateScore = () => {
    let correct = 0;
    answers.forEach((answer, idx) => {
      if (answer === quizData[idx].correctAnswer) correct++;
    });
    return (correct / quizData.length) * 100;
  };

  const finishQuiz = async () => {
    const score = calculateScore();
    try {
      await saveQuizResultFn(quizData, answers, score);
      toast.success("Quiz completed!");
    } catch (err) {
      toast.error("Failed to save quiz result");
    }
  };

  const handleNext = () => {
    if (currentQuestion < quizData.length - 1) {
      setCurrentQuestion((q) => q + 1);
      setShowExplanation(false);
    } else {
      finishQuiz();
    }
  };

  /* ---------------------------
     Quiz UI
  ---------------------------- */
  return (
    <Card className="mx-2">
      <CardHeader>
        <CardTitle>
          Question {currentQuestion + 1} of {quizData.length}
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          Topic: <strong>{topic}</strong>
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        <p className="text-lg font-medium">{question.question}</p>

        <RadioGroup
          value={answers[currentQuestion]}
          onValueChange={handleAnswer}
          className="space-y-2"
        >
          {question.options.map((option, index) => (
            <div key={index} className="flex items-center space-x-2">
              <RadioGroupItem value={option} id={`opt-${index}`} />
              <Label htmlFor={`opt-${index}`}>{option}</Label>
            </div>
          ))}
        </RadioGroup>

        {showExplanation && (
          <div className="mt-4 p-4 bg-muted rounded-lg">
            <p className="font-medium">Explanation</p>
            <p className="text-muted-foreground">
              {question.explanation}
            </p>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex justify-between">
        {!showExplanation && (
          <Button
            variant="outline"
            onClick={() => setShowExplanation(true)}
            disabled={!answers[currentQuestion]}
          >
            Show Explanation
          </Button>
        )}

        <Button
          onClick={handleNext}
          disabled={!answers[currentQuestion]}
          className="ml-auto"
        >
          {currentQuestion < quizData.length - 1
            ? "Next Question"
            : "Finish Quiz"}
        </Button>
      </CardFooter>
    </Card>
  );
}
