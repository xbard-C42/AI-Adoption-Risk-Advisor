import React, { useState, useMemo, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI } from "@google/genai";
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Type definitions
declare global {
    interface Window {
        C42_SDK?: {
            version: string;
            subscribe: (eventType: string, callback: (payload: any) => void) => void;
            request: (action: string, payload: any) => Promise<any>;
        };
    }
}

interface CohortParams {
    t0: number;
    k: number;
    w: number;
    color: string;
}

interface Cohorts {
    [key: string]: CohortParams;
}

// A small component for parameter sliders
const ParameterSlider = ({ label, value, min, max, step, onChange, unit = '' }) => (
    <div className="parameter-slider">
        <label>
            <span>{label}</span>
            <span>{value}{unit}</span>
        </label>
        <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={onChange}
            aria-label={label}
        />
    </div>
);

// A simple card component for layout
const Card = ({ children, className = '' }) => (
    <div className={`card ${className}`}>
        {children}
    </div>
);

const years = Array.from({ length: 21 }, (_, i) => 2020 + i);
const logistic = (t: number, t0: number, k: number) => 1 / (1 + Math.exp(-k * (t - t0)));

// Compute time-to-threshold: year when adoption >= threshold, or null if not reached
const computeTimeToThreshold = (params: { t0: number; k: number }, threshold = 0.9) => {
  for (let t of years) {
    if (logistic(t, params.t0, params.k) >= threshold) {
      return t;
    }
  }
  return null;
};

// Compute area-under-curve (trapezoidal integration)
const computeAUC = (params: { t0: number; k: number }) => {
  let auc = 0;
  for (let i = 1; i < years.length; i++) {
    const tPrev = years[i - 1];
    const tCurr = years[i];
    const aPrev = logistic(tPrev, params.t0, params.k);
    const aCurr = logistic(tCurr, params.t0, params.k);
    auc += ((aPrev + aCurr) / 2) * (tCurr - tPrev);
  }
  return +auc.toFixed(2);
};

const initialGens: Cohorts = {
    'Gen Z': { t0: 2023, k: 1.2, w: 0.2, color: '#8884d8' },
    Millennials: { t0: 2025, k: 1.0, w: 0.35, color: '#82ca9d' },
    'Gen X': { t0: 2027, k: 0.8, w: 0.25, color: '#ffc658' },
    Boomers: { t0: 2030, k: 0.6, w: 0.2, color: '#ff8042' }
};

const initialInds: Cohorts = {
    Finance: { t0: 2022, k: 1.1, w: 0.3, color: '#0088FE' },
    Manufacturing: { t0: 2025, k: 0.9, w: 0.3, color: '#00C49F' },
    Healthcare: { t0: 2028, k: 0.7, w: 0.4, color: '#FFBB28' }
};

export default function AiAdoptionRiskApp() {
    const [gens, setGens] = useState<Cohorts>(initialGens);
    const [inds, setInds] = useState<Cohorts>(initialInds);
    const [shock, setShock] = useState(-0.1);
    const [c42sdk, setC42Sdk] = useState<any>(null);

    const [aiAnalysis, setAiAnalysis] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (window.C42_SDK) {
                console.log('C42 SDK Detected. Version:', window.C42_SDK.version);
                setC42Sdk(window.C42_SDK);

                window.C42_SDK.subscribe('theme_change', (newTheme: 'light' | 'dark') => {
                    console.log('Host theme is now:', newTheme);
                    document.documentElement.classList.toggle('dark', newTheme === 'dark');
                });
            } else {
                console.warn('C42 SDK not found. Running in standalone mode.');
                 if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                    document.documentElement.classList.add('dark');
                }
            }
        }, 50);

        return () => clearTimeout(timer);
    }, []);


    const {
        genData, indData, genVelData, indVelData, HGen, HInd, cascade,
        timeToThresholdGen, timeToThresholdInd, aucGen, aucInd,
        genPeakVel, indPeakVel, HGenPeak, HIndPeak, cascadePeak,
        intervalsGen, intervalsInd
    } = useMemo(() => {
        const normalizeWeights = (cohorts: Cohorts): Cohorts => {
            const totalWeight = Object.values(cohorts).reduce((sum, p) => sum + p.w, 0);
            if (totalWeight === 0) return cohorts;
            const newCohorts: Cohorts = {};
            for (const key in cohorts) {
                newCohorts[key] = { ...cohorts[key], w: cohorts[key].w / totalWeight };
            }
            return newCohorts;
        };

        const normalizedGens = normalizeWeights(gens);
        const normalizedInds = normalizeWeights(inds);

        const genData = years.map((yr) => {
            const row: { year: number; [key: string]: number } = { year: yr };
            Object.entries(gens).forEach(([name, p]) => {
                row[name] = +logistic(yr, p.t0, p.k).toFixed(3);
            });
            return row;
        });

        const indData = years.map((yr) => {
            const row: { year: number; [key: string]: number } = { year: yr };
            Object.entries(inds).forEach(([name, p]) => {
                row[name] = +logistic(yr, p.t0, p.k).toFixed(3);
            });
            return row;
        });

        const genVelData = genData.slice(1).map((row, idx) => {
            const velRow: { year: number, [key: string]: number } = { year: years[idx + 1] };
            Object.keys(gens).forEach((name) => {
                velRow[name] = +(row[name] - genData[idx][name]).toFixed(3);
            });
            return velRow;
        });

        const indVelData = indData.slice(1).map((row, idx) => {
            const velRow: { year: number, [key: string]: number } = { year: years[idx + 1] };
            Object.keys(inds).forEach((name) => {
                velRow[name] = +(row[name] - indData[idx][name]).toFixed(3);
            });
            return velRow;
        });

        const HGen = genData.map((row) =>
            +Object.entries(normalizedGens)
                .reduce((sum, [name, p]) => sum + (p.w * row[name]) ** 2, 0)
                .toFixed(4)
        );
        const HInd = indData.map((row) =>
            +Object.entries(normalizedInds)
                .reduce((sum, [name, p]) => sum + (p.w * row[name]) ** 2, 0)
                .toFixed(4)
        );

        const E: { [key: string]: { [key: string]: number } } = {
            Finance: { Finance: 0.4, Manufacturing: 0.2, Healthcare: 0.1 },
            Manufacturing: { Finance: 0.3, Manufacturing: 0.1, Healthcare: 0.2 },
            Healthcare: { Finance: 0.2, Manufacturing: 0.3, Healthcare: 0.1 }
        };

        const cascade = Object.keys(inds).map((sector) => ({
            sector,
            delta: +(E[sector].Finance * shock).toFixed(3)
        }));

        const timeToThresholdGen = Object.fromEntries(
            Object.entries(gens).map(([name, p]) => [name, computeTimeToThreshold(p)])
        );
        const timeToThresholdInd = Object.fromEntries(
            Object.entries(inds).map(([name, p]) => [name, computeTimeToThreshold(p)])
        );

        const aucGen = Object.fromEntries(
            Object.entries(gens).map(([name, p]) => [name, computeAUC(p)])
        );
        const aucInd = Object.fromEntries(
            Object.entries(inds).map(([name, p]) => [name, computeAUC(p)])
        );

        // Advanced Metrics
        const findPeak = (data: { year: number, [key: string]: number }[], keys: string[]) => {
            const peaks: { [key: string]: { year: number, value: number } } = {};
            keys.forEach(name => {
                if(data.length === 0) {
                    peaks[name] = { year: 0, value: 0 };
                    return;
                }
                const peak = data.reduce<{ year: number; value: number }>(
                    (max, row) => (row[name] > max.value ? { year: row.year, value: row[name] } : max),
                    { year: data[0].year, value: data[0][name] }
                );
                peaks[name] = peak;
            });
            return peaks;
        };

        const genPeakVel = findPeak(genVelData, Object.keys(gens));
        const indPeakVel = findPeak(indVelData, Object.keys(inds));

        const findArrayPeak = (data: number[]) => {
            if (data.length === 0) return { year: 0, value: 0 };
            const peakValue = Math.max(...data);
            const peakIndex = data.indexOf(peakValue);
            return { year: years[peakIndex], value: peakValue };
        };

        const HGenPeak = findArrayPeak(HGen);
        const HIndPeak = findArrayPeak(HInd);

        const cascadePeak = cascade.reduce((worst, row) => (row.delta < worst.delta ? row : worst), cascade[0] || { sector: 'N/A', delta: 0 });

        const intervalsGen: { [key: string]: { toPeak: number, peakTo90: number } } = {};
        for (const name of Object.keys(gens)) {
            const t0 = gens[name].t0;
            const peakYear = genPeakVel[name].year;
            const thYear = timeToThresholdGen[name] || peakYear; // Fallback to peak year if 90% is not reached
            intervalsGen[name] = { toPeak: peakYear - t0, peakTo90: thYear - peakYear };
        }
        const intervalsInd: { [key: string]: { toPeak: number, peakTo90: number } } = {};
        for (const name of Object.keys(inds)) {
            const t0 = inds[name].t0;
            const peakYear = indPeakVel[name].year;
            const thYear = timeToThresholdInd[name] || peakYear;
            intervalsInd[name] = { toPeak: peakYear - t0, peakTo90: thYear - peakYear };
        }

        return { genData, indData, genVelData, indVelData, HGen, HInd, cascade, timeToThresholdGen, timeToThresholdInd, aucGen, aucInd, genPeakVel, indPeakVel, HGenPeak, HIndPeak, cascadePeak, intervalsGen, intervalsInd };
    }, [gens, inds, shock]);

    const handleParamChange = (setter: React.Dispatch<React.SetStateAction<Cohorts>>, cohort: string, field: keyof Omit<CohortParams, 'color'>) => (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseFloat(e.target.value);
        setter((prev) => ({
            ...prev,
            [cohort]: { ...prev[cohort], [field]: val }
        }));
    };

    const getAiAnalysis = async () => {
        setIsLoading(true);
        setError(null);
        setAiAnalysis('');

        const genDetails = Object.entries(gens)
            .map(([name, p]) => `- ${name}: Midpoint Year (t0)=${p.t0}, Steepness (k)=${p.k.toFixed(2)}, Weight (w)=${p.w.toFixed(2)}`)
            .join('\n');

        const indDetails = Object.entries(inds)
            .map(([name, p]) => `- ${name}: Midpoint Year (t0)=${p.t0}, Steepness (k)=${p.k.toFixed(2)}, Weight (w)=${p.w.toFixed(2)}`)
            .join('\n');

        const prompt = `You are an expert risk analyst specializing in technology adoption. Based on the following parameters for AI adoption, provide a concise risk analysis.

**Generational Cohorts Data:**
${genDetails}

**Industry Cohorts Data:**
${indDetails}

**Shock Scenario:**
A shock of ${shock.toFixed(2)} is applied to the Finance sector, impacting other sectors through a predefined cascade matrix.

**Analysis Request:**
Please provide your analysis in markdown format with the following sections:
1.  **### Executive Summary**
    A brief overview of the overall risk profile based on the adoption curves and concentration indices.
2.  **### Key Risks**
    Identify the top 2-3 risks (e.g., rapid adoption in one demographic creating a skills gap, high concentration in a specific industry, vulnerability to shocks).
3.  **### Strategic Recommendations**
    Suggest 1-2 actionable strategies to mitigate these risks.`;

        try {
            let analysisText = '';
            if (c42sdk) {
                // C42 OS Integrated Mode
                console.log('Requesting AI response from Kernel...');
                const response = await c42sdk.request('generate_response', { topic: prompt });
                analysisText = response.text;
            } else {
                // Standalone Mode
                console.log('Requesting AI response in standalone mode...');
                const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
                const response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash-preview-04-17',
                    contents: prompt,
                });
                analysisText = response.text;
            }
            setAiAnalysis(analysisText);

        } catch (err) {
            console.error('Failed to get analysis:', err);
            const errorMessage = c42sdk
                ? 'Kernel failed to generate response. Please check the C42 OS host.'
                : 'Failed to get analysis. In standalone mode, please ensure your API key is configured correctly.';
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const simpleRenderAnalysis = (text: string) => {
        if (!text) return null;

        const sections = text.split(/### (.*?)\n/g).slice(1);
        const elements: JSX.Element[] = [];

        for (let i = 0; i < sections.length; i += 2) {
            const title = sections[i];
            const content = sections[i + 1];
            elements.push(<h4 key={`h-${i}`}>{title}</h4>);

            const lines = content.split('\n').filter(line => line.trim() !== '');
            const listItems = lines.filter(line => line.trim().startsWith('- ') || line.trim().startsWith('* '));
            const paragraphs = lines.filter(line => !line.trim().startsWith('- ') && !line.trim().startsWith('* '));

            paragraphs.forEach((p, idx) => elements.push(<p key={`p-${i}-${idx}`}>{p}</p>));

            if (listItems.length > 0) {
                elements.push(
                    <ul key={`ul-${i}`}>
                        {listItems.map((item, idx) => <li key={`li-${i}-${idx}`}>{item.substring(2)}</li>)}
                    </ul>
                );
            }
        }

        return <div className="ai-analysis">{elements}</div>;
    };

    return (
        <div className="app-container">
            <aside className="sidebar">
                <h1>AI Risk Controls</h1>

                <div className="cohort-controls">
                    <h2>Generational Cohorts</h2>
                    {Object.entries(gens).map(([name, p]) => (
                        <div key={name}>
                            <h3>{name}</h3>
                            <ParameterSlider label="Midpoint (t₀)" value={p.t0} min={2020} max={2040} step={1} onChange={handleParamChange(setGens, name, 't0')} unit=" year" />
                            <ParameterSlider label="Steepness (k)" value={p.k} min={0.1} max={3} step={0.1} onChange={handleParamChange(setGens, name, 'k')} />
                            <ParameterSlider label="Weight (w)" value={p.w} min={0} max={1} step={0.01} onChange={handleParamChange(setGens, name, 'w')} />
                        </div>
                    ))}
                </div>

                <div className="cohort-controls">
                    <h2>Industry Cohorts</h2>
                    {Object.entries(inds).map(([name, p]) => (
                        <div key={name}>
                            <h3>{name}</h3>
                            <ParameterSlider label="Midpoint (t₀)" value={p.t0} min={2020} max={2040} step={1} onChange={handleParamChange(setInds, name, 't0')} unit=" year" />
                            <ParameterSlider label="Steepness (k)" value={p.k} min={0.1} max={3} step={0.1} onChange={handleParamChange(setInds, name, 'k')} />
                            <ParameterSlider label="Weight (w)" value={p.w} min={0} max={1} step={0.01} onChange={handleParamChange(setInds, name, 'w')} />
                        </div>
                    ))}
                </div>

                <div>
                    <h2>Shock Scenario</h2>
                    <ParameterSlider label="Finance Shock" value={shock} min={-0.5} max={0.5} step={0.01} onChange={(e) => setShock(parseFloat(e.target.value))} />
                </div>
            </aside>

            <main className="main-content">
                <Card>
                    <h2>Adoption Curves</h2>
                    <div className="chart-grid">
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={genData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                <XAxis dataKey="year" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                {Object.entries(gens).map(([name, p]) => (
                                    <Line key={name} dataKey={name} dot={false} stroke={p.color} strokeWidth={2} />
                                ))}
                            </LineChart>
                        </ResponsiveContainer>
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={indData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                <XAxis dataKey="year" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                {Object.entries(inds).map(([name, p]) => (
                                    <Line key={name} dataKey={name} dot={false} stroke={p.color} strokeWidth={2} />
                                ))}
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                <Card>
                    <h2>Adoption Velocity</h2>
                    <div className="chart-grid">
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={genVelData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                <XAxis dataKey="year" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                {Object.entries(gens).map(([name, p]) => (
                                    <Line key={name} dataKey={name} dot={false} stroke={p.color} strokeWidth={2} name={`${name} (vel)`} />
                                ))}
                            </LineChart>
                        </ResponsiveContainer>
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={indVelData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                <XAxis dataKey="year" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                {Object.entries(inds).map(([name, p]) => (
                                    <Line key={name} dataKey={name} dot={false} stroke={p.color} strokeWidth={2} name={`${name} (vel)`} />
                                ))}
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
                
                <Card>
                    <h2>Key Risk Indicators</h2>
                    <div className="key-indicators-grid">
                        <div className="indicator-item">
                            <span className="indicator-label">Peak Generational HHI</span>
                            <span className="indicator-value">{HGenPeak.value.toFixed(4)} <span className="indicator-year">in {HGenPeak.year}</span></span>
                        </div>
                        <div className="indicator-item">
                            <span className="indicator-label">Peak Industry HHI</span>
                            <span className="indicator-value">{HIndPeak.value.toFixed(4)} <span className="indicator-year">in {HIndPeak.year}</span></span>
                        </div>
                        <div className="indicator-item">
                            <span className="indicator-label">Worst Cascade Impact</span>
                            <span className={`indicator-value ${cascadePeak.delta < 0 ? 'text-danger' : 'text-accent'}`}>{cascadePeak.delta.toFixed(3)} <span className="indicator-year">on {cascadePeak.sector}</span></span>
                        </div>
                    </div>
                </Card>

                <div className="chart-grid">
                    <Card>
                        <h2>Concentration Risk (HHI)</h2>
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={years.map((yr, i) => ({ year: yr, Generational: HGen[i], Industry: HInd[i] }))} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                <XAxis dataKey="year" />
                                <YAxis domain={[0, 'auto']} />
                                <Tooltip />
                                <Legend />
                                <Line type="monotone" dataKey="Generational" dot={false} stroke="#8884d8" strokeWidth={2} />
                                <Line type="monotone" dataKey="Industry" dot={false} stroke="#0088FE" strokeWidth={2} />
                            </LineChart>
                        </ResponsiveContainer>
                    </Card>

                    <Card>
                        <h2>Cascade Vulnerability</h2>
                        <table className="custom-table">
                            <thead>
                                <tr>
                                    <th>Industry</th>
                                    <th>Δ Adoption</th>
                                </tr>
                            </thead>
                            <tbody>
                                {cascade.map((row) => (
                                    <tr key={row.sector}>
                                        <td>{row.sector}</td>
                                        <td className={row.delta < 0 ? 'text-danger' : 'text-accent'}>{row.delta.toFixed(3)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </Card>

                    <Card>
                        <h2 className="table-card-header">Time to 90% Adoption</h2>
                        <table className="custom-table">
                            <thead>
                                <tr>
                                    <th>Cohort</th>
                                    <th>Year to 90%</th>
                                </tr>
                            </thead>
                            <tbody>
                                {Object.entries(timeToThresholdGen).map(([name, yr]) => (
                                    <tr key={name}>
                                        <td>{name}</td>
                                        <td>{yr || 'Not Reached'}</td>
                                    </tr>
                                ))}
                                {Object.entries(timeToThresholdInd).map(([name, yr]) => (
                                    <tr key={name}>
                                        <td>{name}</td>
                                        <td>{yr || 'Not Reached'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </Card>

                    <Card>
                        <h2 className="table-card-header">Total Exposure (AUC)</h2>
                        <table className="custom-table">
                            <thead>
                                <tr>
                                    <th>Cohort</th>
                                    <th>AUC</th>
                                </tr>
                            </thead>
                            <tbody>
                                {Object.entries(aucGen).map(([name, val]) => (
                                    <tr key={name}>
                                        <td>{name}</td>
                                        <td>{val}</td>
                                    </tr>
                                ))}
                                {Object.entries(aucInd).map(([name, val]) => (
                                    <tr key={name}>
                                        <td>{name}</td>
                                        <td>{val}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </Card>

                    <Card>
                        <h2 className="table-card-header">Intervening Time Intervals</h2>
                        <table className="custom-table">
                            <thead>
                                <tr>
                                    <th>Cohort/Sector</th>
                                    <th>Years to Peak Vel.</th>
                                    <th>Years Peak → 90%</th>
                                </tr>
                            </thead>
                            <tbody>
                                {Object.entries(intervalsGen).map(([name, iv]) => (
                                    <tr key={name + '-int'}>
                                        <td>{name}</td>
                                        <td>{iv.toPeak}</td>
                                        <td>{iv.peakTo90}</td>
                                    </tr>
                                ))}
                                {Object.entries(intervalsInd).map(([name, iv]) => (
                                    <tr key={name + '-int-ind'}>
                                        <td>{name}</td>
                                        <td>{iv.toPeak}</td>
                                        <td>{iv.peakTo90}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </Card>
                </div>

                <Card>
                    <h2>AI Risk Advisor</h2>
                    <p>Get a qualitative risk analysis of the current scenario from a generative AI model.</p>
                    <button onClick={getAiAnalysis} disabled={isLoading} className="ai-button">
                        {isLoading ? 'Analyzing...' : 'Get AI Analysis'}
                    </button>
                    {isLoading && <div className="loading-indicator">Please wait while the AI analyzes the data...</div>}
                    {error && <div className="error-message">{error}</div>}
                    {simpleRenderAnalysis(aiAnalysis)}
                </Card>
            </main>
        </div>
    );
}

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <AiAdoptionRiskApp />
    </React.StrictMode>
  );
}
