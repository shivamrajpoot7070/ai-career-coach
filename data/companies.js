import { QUESTION_BANK } from "./QuestionBank";
import { COMPANY_PROFILES } from "./companyProfiles";
import { selectQuestionsForCompany } from "./questionSelector";

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
].map(company => {
  const profile = COMPANY_PROFILES[company.slug];

  return {
    ...company,
    topics: {
      Arrays: selectQuestionsForCompany(QUESTION_BANK.Arrays, company.slug, profile),
      DynamicProgramming: selectQuestionsForCompany(QUESTION_BANK.DynamicProgramming, company.slug, profile),
      Stacks: selectQuestionsForCompany(QUESTION_BANK.Stacks, company.slug, profile),
      Recursion: selectQuestionsForCompany(QUESTION_BANK.Recursion, company.slug, profile),
      Strings: selectQuestionsForCompany(QUESTION_BANK.Strings, company.slug, profile),
      Graphs: selectQuestionsForCompany(QUESTION_BANK.Graphs, company.slug, profile),
      Trees: selectQuestionsForCompany(QUESTION_BANK.Trees, company.slug, profile),
      HashMap: selectQuestionsForCompany(QUESTION_BANK.HashMap, company.slug, profile),
      Queue: selectQuestionsForCompany(QUESTION_BANK.Queue, company.slug, profile)
    }
  };
});
