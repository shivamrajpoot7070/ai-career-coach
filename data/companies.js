import { QUESTION_BANK } from "./QuestionBank";

// deterministic shuffle using company slug
const companyShuffleScore = (title, companySlug) => {
  let hash = 0;
  const str = title + companySlug;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
};

const sortQuestions = (questions, companySlug) => {
  return [...questions].sort((a, b) => {
    const pa = a.priority?.[companySlug];
    const pb = b.priority?.[companySlug];

    // 1️⃣ If priority exists → use it
    if (pa !== undefined || pb !== undefined) {
      return (pb ?? 0) - (pa ?? 0);
    }

    // 2️⃣ Otherwise → company-based shuffle
    return (
      companyShuffleScore(a.title, companySlug) -
      companyShuffleScore(b.title, companySlug)
    );
  });
};
export const companies = [
  { name: "Amazon", slug: "amazon" },
  { name: "Google", slug: "google" },
  { name: "Walmart", slug: "walmart" },
  { name: "Flipkart", slug: "flipkart" },
  { name: "Microsoft", slug: "microsoft" },
  { name: "Meta", slug: "meta" },
  { name: "Adobe", slug: "adobe" },
  { name: "Salesforce", slug: "salesforce" },
  { name: "Uber", slug: "uber" },
  { name: "LinkedIn", slug: "linkedin" },
  { name: "Twitter", slug: "twitter" },
  { name: "Snapchat", slug: "snapchat" }
].map(company => ({
  ...company,
  topics: {
    Arrays: sortQuestions(QUESTION_BANK.Arrays, company.slug),
    DynamicProgramming: sortQuestions(QUESTION_BANK.DynamicProgramming, company.slug),
    Stacks: sortQuestions(QUESTION_BANK.Stacks, company.slug),
    Recursion: sortQuestions(QUESTION_BANK.Recursion, company.slug),
    Strings: sortQuestions(QUESTION_BANK.Strings, company.slug),
    Graphs: sortQuestions(QUESTION_BANK.Graphs, company.slug),
     Trees: sortQuestions(QUESTION_BANK.Trees, company.slug),
  HashMap: sortQuestions(QUESTION_BANK.HashMap, company.slug),
  Queue: sortQuestions(QUESTION_BANK.Queue, company.slug)
  }
}));
