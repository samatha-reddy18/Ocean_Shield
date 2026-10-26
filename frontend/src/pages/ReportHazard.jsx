import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, MapPin, LocateFixed, Calendar, Upload, X, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { reportApi } from '../services/reportService.js';
import { errorMessage } from '../services/api.js';
import { CATEGORY_OPTIONS } from '../utils/format.js';

export default function ReportHazard() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [form, setForm] = useState({
    title: '',
    category: '',
    description: '',
    latitude: '',
    longitude: '',
    observationDate: '',
  });
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');

  const handleFiles = (selected) => {
    const list = Array.from(selected).slice(0, 5 - files.length);
    if (!list.length) return;
    setFiles((prev) => [...prev, ...list]);
    list.forEach((f) => {
      const reader = new FileReader();
      reader.onload = () => setPreviews((prev) => [...prev, reader.result]);
      reader.readAsDataURL(f);
    });
  };

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setServerError('Geolocation is not supported by your browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((f) => ({
          ...f,
          latitude: pos.coords.latitude.toFixed(6),
          longitude: pos.coords.longitude.toFixed(6),
        }));
      },
      () => setServerError('Could not get your location. Please enter coordinates manually.'),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const validate = () => {
    const e = {};
    if (!form.title || form.title.length < 3) e.title = 'Title must be at least 3 characters';
    if (!form.category) e.category = 'Please select a hazard category';
    if (!form.description || form.description.length < 10) e.description = 'Description must be at least 10 characters';
    const lat = parseFloat(form.latitude);
    const lon = parseFloat(form.longitude);
    if (isNaN(lat) || lat < -90 || lat > 90) e.latitude = 'Enter a valid latitude (-90 to 90)';
    if (isNaN(lon) || lon < -180 || lon > 180) e.longitude = 'Enter a valid longitude (-180 to 180)';
    if (!form.observationDate) e.observationDate = 'Observation date is required';
    else if (new Date(form.observationDate) > new Date()) e.observationDate = 'Observation date cannot be in the future';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');
    if (!validate()) return;
    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('title', form.title);
      formData.append('category', form.category);
      formData.append('description', form.description);
      formData.append('latitude', form.latitude);
      formData.append('longitude', form.longitude);
      formData.append('observationDate', form.observationDate);
      files.forEach((f) => formData.append('images', f));

      const created = await reportApi.createReport(formData);
      navigate(`/reports/${created._id}`, { state: { justCreated: true, reportId: created.reportId } });
    } catch (err) {
      setServerError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container" style={{ maxWidth: 760, paddingBottom: '2rem' }}>
      <div className="page-header">
        <h1>Report a Hazard</h1>
        <p>Submit a suspected ocean or coastal environmental hazard with supporting evidence.</p>
      </div>

      {serverError && <div className="alert alert-error">{serverError}</div>}
      <div className="alert alert-info" style={{ fontSize: '0.85rem' }}>
        <AlertTriangle size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
        Your report helps community awareness and investigation. It is not a substitute for official inspection or emergency response.
      </div>

      <form onSubmit={handleSubmit} className="card">
        {/* Title */}
        <div className="form-group">
          <label className="form-label">Report Title *</label>
          <input
            className="form-input"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="e.g. Oil slick near the harbor entrance"
            maxLength={160}
          />
          {errors.title && <span className="form-error">{errors.title}</span>}
        </div>

        {/* Category */}
        <div className="form-group">
          <label className="form-label">Hazard Category *</label>
          <select
            className="form-select"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
          >
            <option value="">Select a category...</option>
            {CATEGORY_OPTIONS.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
          {errors.category && <span className="form-error">{errors.category}</span>}
        </div>

        {/* Description */}
        <div className="form-group">
          <label className="form-label">Description *</label>
          <textarea
            className="form-textarea"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Describe what you observed: extent, color, smell, wildlife impact, possible source, weather/sea conditions..."
            maxLength={5000}
          />
          <div className="flex items-center justify-between">
            {errors.description ? <span className="form-error">{errors.description}</span> : <span />}
            <span className="text-muted" style={{ fontSize: '0.8rem' }}>{form.description.length}/5000</span>
          </div>
        </div>

        {/* Images */}
        <div className="form-group">
          <label className="form-label">Photographs (up to 5)</label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            style={{ display: 'none' }}
            onChange={(e) => handleFiles(e.target.files)}
          />
          <button type="button" className="btn btn-secondary" onClick={() => fileInputRef.current?.click()}>
            <Upload size={18} /> Choose images
          </button>
          <span className="form-hint">JPG, PNG, WEBP, GIF. Max 10 MB each.</span>

          {previews.length > 0 && (
            <div className="flex gap-2 mt-4" style={{ flexWrap: 'wrap' }}>
              {previews.map((src, i) => (
                <div key={i} style={{ position: 'relative', width: 90, height: 90 }}>
                  <img src={src} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border)' }} />
                  <button
                    type="button"
                    onClick={() => removeFile(i)}
                    style={{
                      position: 'absolute', top: -6, right: -6,
                      background: 'var(--red-500)', color: 'white', borderRadius: '50%',
                      width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Location */}
        <div className="form-group">
          <label className="form-label">Location Coordinates *</label>
          <div className="flex gap-2" style={{ flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ flex: 1, minWidth: 140 }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Latitude</label>
              <div className="flex items-center gap-2">
                <MapPin size={16} className="text-muted" />
                <input
                  type="number"
                  step="any"
                  className="form-input"
                  value={form.latitude}
                  onChange={(e) => setForm({ ...form, latitude: e.target.value })}
                  placeholder="e.g. 12.9716"
                />
              </div>
              {errors.latitude && <span className="form-error">{errors.latitude}</span>}
            </div>
            <div style={{ flex: 1, minWidth: 140 }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Longitude</label>
              <div className="flex items-center gap-2">
                <MapPin size={16} className="text-muted" />
                <input
                  type="number"
                  step="any"
                  className="form-input"
                  value={form.longitude}
                  onChange={(e) => setForm({ ...form, longitude: e.target.value })}
                  placeholder="e.g. 77.5946"
                />
              </div>
              {errors.longitude && <span className="form-error">{errors.longitude}</span>}
            </div>
            <button type="button" className="btn btn-secondary" onClick={useMyLocation}>
              <LocateFixed size={16} /> Use my location
            </button>
          </div>
        </div>

        {/* Observation date */}
        <div className="form-group">
          <label className="form-label">Observation Date & Time *</label>
          <div className="flex items-center gap-2">
            <Calendar size={18} className="text-muted" />
            <input
              type="datetime-local"
              className="form-input"
              value={form.observationDate}
              onChange={(e) => setForm({ ...form, observationDate: e.target.value })}
            />
          </div>
          {errors.observationDate && <span className="form-error">{errors.observationDate}</span>}
        </div>

        <div className="flex gap-2 mt-4">
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            <CheckCircle2 size={18} /> {submitting ? 'Submitting...' : 'Submit Report'}
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => navigate(-1)} disabled={submitting}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
