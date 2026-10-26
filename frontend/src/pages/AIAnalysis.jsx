import { useEffect, useState } from 'react';
import { Bot, Sparkles, Copy, Activity, Image, FileText, CheckCircle2, XCircle } from 'lucide-react';
import { aiApi } from '../services/aiService.js';
import { errorMessage } from '../services/api.js';

export default function AIAnalysis() {
  const [health, setHealth] = useState(null);
  const [text, setText] = useState('');
  const [textResult, setTextResult] = useState(null);
  const [textBusy, setTextBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    aiApi.checkHealth().then(setHealth).catch(() => setHealth({ available: false }));
  }, []);

  const runTextAnalysis = async () => {
    if (!text.trim()) return;
    setTextBusy(true);
    setError('');
    try {
      const result = await aiApi.analyzeText(text);
      setTextResult(result.analysis || result);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setTextBusy(false);
    }
  };

  const sample = 'Spotted a large oil slick stretching roughly 200 metres along the coast near Marina Beach this morning around 7am. The water had a dark brown sheen and a strong petroleum smell. Weather was calm with light winds. Did not see any wildlife affected yet but the area is usually busy with seabirds.';

  const capabilities = [
    { icon: Image, title: 'Image Classification', text: 'Computer vision classifies uploaded photos into supported hazard categories with a confidence score and model version tracking.' },
    { icon: FileText, title: 'NLP Extraction', text: 'Natural language processing extracts keywords, location references, and a summary, and flags potentially missing information from descriptions.' },
    { icon: Copy, title: 'Duplicate Detection', text: 'Rule-based geographic, temporal, and textual similarity identifies potentially related reports for administrator review.' },
  ];

  return (
    <div className="container" style={{ paddingBottom: '2rem' }}>
      <div className="page-header">
        <h1 className="flex items-center gap-2"><Bot size={24} color="var(--cyan-500)" /> AI Analysis</h1>
        <p>Understand and try the AI-assisted analysis functions powering OceanShield.</p>
      </div>

      {/* Service status */}
      <div className="card mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Activity size={20} color={health?.available ? 'var(--green-500)' : 'var(--red-500)'} />
          <div>
            <strong>AI Service Status</strong>
            <div className="text-muted" style={{ fontSize: '0.85rem' }}>
              {health === null ? 'Checking...' : health.available ? `Online • backend: ${health.dl_backend || 'rule-based'} • model: ${health.model_version || '—'}` : 'Offline — the Python AI service is not reachable. Reports still save with AI status "pending".'}
            </div>
          </div>
        </div>
        {health?.available ? <CheckCircle2 color="var(--green-500)" /> : <XCircle color="var(--red-500)" />}
      </div>

      {/* Capabilities */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        {capabilities.map((c) => (
          <div key={c.title} className="card card-hover">
            <div style={{ width: 44, height: 44, borderRadius: 10, background: 'rgba(6,182,212,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
              <c.icon size={22} color="var(--cyan-500)" />
            </div>
            <h3 style={{ fontSize: '1.05rem', marginBottom: 4 }}>{c.title}</h3>
            <p className="text-muted" style={{ fontSize: '0.9rem' }}>{c.text}</p>
          </div>
        ))}
      </div>

      {/* Try NLP */}
      <div className="card">
        <h3 className="flex items-center gap-2 mb-3"><Sparkles size={18} color="var(--teal-500)" /> Try NLP Extraction</h3>
        <p className="text-muted mb-4" style={{ fontSize: '0.9rem' }}>
          Paste a hazard description below to see keyword extraction, location references, a summary, and missing-information flags.
        </p>

        {error && <div className="alert alert-error">{error}</div>}

        <div className="form-group">
          <label className="form-label">Description</label>
          <textarea
            className="form-textarea"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Describe an ocean hazard..."
            rows={5}
          />
          <button className="btn btn-ghost mt-2" onClick={() => setText(sample)}>Use sample text</button>
        </div>

        <button className="btn btn-primary" onClick={runTextAnalysis} disabled={textBusy || !text.trim()}>
          <Sparkles size={16} /> {textBusy ? 'Analyzing...' : 'Analyze Text'}
        </button>

        {textResult && (
          <div className="mt-4">
            <div className="form-group">
              <div className="form-label">Keywords</div>
              <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
                {textResult.keywords?.length ? textResult.keywords.map((k) => <span key={k} className="badge badge-low">{k}</span>) : <span className="text-muted">None detected</span>}
              </div>
            </div>
            {textResult.locationReferences?.length > 0 && (
              <div className="form-group">
                <div className="form-label">Location references</div>
                <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
                  {textResult.locationReferences.map((l) => <span key={l} className="badge badge-info_requested">{l}</span>)}
                </div>
              </div>
            )}
            {textResult.summary && (
              <div className="form-group">
                <div className="form-label">Summary</div>
                <p style={{ fontSize: '0.92rem' }}>{textResult.summary}</p>
              </div>
            )}
            {textResult.missingInfo?.length > 0 && (
              <div className="form-group">
                <div className="form-label">Potentially missing information</div>
                <ul style={{ paddingLeft: 20, fontSize: '0.9rem' }}>
                  {textResult.missingInfo.map((m) => <li key={m}>{m}</li>)}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="alert alert-info mt-4" style={{ fontSize: '0.85rem' }}>
        <Bot size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
        AI output is an automated assessment, not a confirmed environmental finding. The selected model should be evaluated against representative labelled images before predictions are treated as useful classifications.
      </div>
    </div>
  );
}
