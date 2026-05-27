declare module 'jstat' {
  interface NormalDistribution {
    cdf(x: number, mean: number, std: number): number;
    inv(p: number, mean: number, std: number): number;
    pdf(x: number, mean: number, std: number): number;
    mean(mean: number, std: number): number;
    median(mean: number, std: number): number;
    mode(mean: number, std: number): number;
    variance(mean: number, std: number): number;
  }

  interface JStatStatic {
    normal: NormalDistribution;
  }

  const jstat: JStatStatic;
  export default jstat;
}
