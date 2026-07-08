declare module "google-trends-api" {
  const googleTrends: {
    relatedQueries(input: {
      keyword: string;
      geo?: string;
      hl?: string;
    }): Promise<string>;
  };

  export default googleTrends;
}
