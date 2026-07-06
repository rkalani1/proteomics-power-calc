import React from 'react';
import { calculateInflation, calculateDesignEffect } from '../utils/statistics';
import type { AnalysisType, StudyDesign } from '../utils/statistics';

interface ScenarioResult {
  proteinCount: number;
  alpha: number;
  minEffect: number;
  powerAtInput: number;
  sampleNeeded: number | string;
  color: {
    bg: string;
    text: string;
    light: string;
    border: string;
    hex: string;
  };
}

interface MinEffectCardsProps {
  scenarioResults: ScenarioResult[];
  effectConfig: { label: string; symbol: string };
  targetPower: number;
  effectDecimals: number;
  analysisType: AnalysisType;
  studyDesign: StudyDesign;
  standardError: number;
  events: number;
  sampleSize: number;
  clusterSize: number;
  icc: number;
  numCases: number;
  numControls: number;
  prevalence: number;
}

export const MinEffectCards: React.FC<MinEffectCardsProps> = ({
  scenarioResults,
  effectConfig,
  targetPower,
  effectDecimals,
  analysisType,
  studyDesign,
  standardError,
  events,
  sampleSize,
  clusterSize,
  icc,
  numCases,
  numControls,
  prevalence,
}) => {
  return (
    <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
        <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Minimum Detectable {effectConfig.label} for {(targetPower * 100).toFixed(0)}% Power
      </h3>

      <div className={`grid grid-cols-1 sm:grid-cols-2 ${scenarioResults.length > 2 ? 'lg:grid-cols-3' : 'lg:grid-cols-2'} gap-4`}>
        {scenarioResults.map((scenario) => (
          <div
            key={scenario.proteinCount}
            className={`p-4 rounded-lg border ${scenario.color.border} ${scenario.color.light}`}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className={`w-3 h-3 rounded-full ${scenario.color.bg}`}></span>
              <span className={`text-sm font-medium ${scenario.color.text}`}>
                {scenario.proteinCount.toLocaleString()} protein{scenario.proteinCount !== 1 ? 's' : ''}
              </span>
            </div>
            <div className={`text-2xl font-bold ${scenario.color.text}`}>
              {effectConfig.symbol} ≥ {scenario.minEffect.toFixed(effectDecimals)}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              α ≈ {scenario.alpha.toExponential(1)}
            </p>
          </div>
        ))}
      </div>

      {/* Effect Size Inflation (comparing first vs last scenario) */}
      {scenarioResults.length >= 2 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span className="font-medium">Effect Size Inflation:</span>
            {(() => {
              const first = scenarioResults[0];
              const last = scenarioResults[scenarioResults.length - 1];
              const inflation = calculateInflation(first.minEffect, last.minEffect);
              return (
                <span className="text-amber-600 font-semibold">
                  {isFinite(inflation) ? `~${inflation.toFixed(1)}%` : 'N/A'}
                  <span className="font-normal text-gray-500 ml-2">
                    ({first.proteinCount.toLocaleString()} → {last.proteinCount.toLocaleString()} proteins)
                  </span>
                </span>
              );
            })()}
          </div>
        </div>
      )}

      {/* Standard Error - always show */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <span className="font-medium">
            {analysisType === 'linear' || analysisType === 'gee' ? 'SE(β)' : `SE(log ${effectConfig.symbol})`}:
          </span>
          <span className="text-purple-600 font-semibold">
            {isFinite(standardError) ? standardError.toFixed(4) : '∞'}
          </span>
          <span className="text-gray-500">
            {analysisType === 'cox'
              ? `(${events} events)`
              : analysisType === 'linear'
              ? `(n = ${sampleSize})`
              : analysisType === 'gee'
              ? `(n = ${sampleSize}, m = ${clusterSize}, ICC = ${icc.toFixed(2)}, DE = ${calculateDesignEffect(clusterSize, icc).toFixed(2)})`
              : (studyDesign === 'case-control' || studyDesign === 'nested-case-control')
              ? `(${numCases} cases, ${numControls} controls)`
              : `(n = ${sampleSize}, prev = ${(prevalence * 100).toFixed(0)}%)`}
          </span>
        </div>
      </div>
    </section>
  );
};
