import { ArrowLeft, ArrowRight, ImagePlus, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios.js';
import { CONDITIONS, MATERIALS, QUANTITY_UNITS } from '../utils/constants.js';

const initialForm = {
  itemType: '',
  material: 'unknown',
  condition: 'unknown',
  quantity: '1',
  quantityUnit: 'items',
  estimatedWeightKg: '',
  city: '',
  state: ''
};

export default function RegisterTextile() {
  const [form, setForm] = useState(initialForm);
  const [photos, setPhotos] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(null);

  useEffect(() => () => previews.forEach((url) => URL.revokeObjectURL(url)), [previews]);

  function update(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: '' }));
    setSuccess(null);
  }

  function choosePhotos(event) {
    const selected = Array.from(event.target.files || []);
    event.target.value = '';
    if (selected.length > 5) {
      setErrors((current) => ({ ...current, photos: 'Choose up to 5 photos.' }));
      return;
    }
    const invalidPhoto = selected.find((file) => !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024);
    if (invalidPhoto) {
      setErrors((current) => ({ ...current, photos: 'Use JPG, PNG, or WEBP images, up to 5 MB each.' }));
      return;
    }
    setPhotos(selected);
    setPreviews(selected.map((file) => URL.createObjectURL(file)));
    setErrors((current) => ({ ...current, photos: '' }));
  }

  function removePhoto(index) {
    const nextPhotos = photos.filter((_, photoIndex) => photoIndex !== index);
    setPhotos(nextPhotos);
    setPreviews(nextPhotos.map((file) => URL.createObjectURL(file)));
  }

  function validate() {
    const nextErrors = {};
    if (!form.itemType.trim()) nextErrors.itemType = 'Enter an item type.';
    else if (form.itemType.trim().length > 100) nextErrors.itemType = 'Keep the item type under 100 characters.';
    if (!Number.isFinite(Number(form.quantity)) || Number(form.quantity) < 1) nextErrors.quantity = 'Quantity must be at least 1.';
    if (form.estimatedWeightKg !== '' && (!Number.isFinite(Number(form.estimatedWeightKg)) || Number(form.estimatedWeightKg) < 0)) {
      nextErrors.estimatedWeightKg = 'Enter a non-negative weight.';
    }
    if (!form.city.trim()) nextErrors.city = 'Enter a city.';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function submit(event) {
    event.preventDefault();
    setSuccess(null);
    if (!validate()) return;

    const payload = new FormData();
    payload.append('itemType', form.itemType.trim());
    payload.append('material', form.material);
    payload.append('condition', form.condition);
    payload.append('quantity', form.quantity);
    payload.append('quantityUnit', form.quantityUnit);
    if (form.estimatedWeightKg !== '') payload.append('estimatedWeightKg', form.estimatedWeightKg);
    payload.append('location[city]', form.city.trim());
    if (form.state.trim()) payload.append('location[state]', form.state.trim());
    photos.forEach((photo) => payload.append('photos', photo));

    setSaving(true);
    setErrors({});
    try {
      const { data } = await api.post('/textiles', payload);
      setSuccess(data.data.textile);
      setForm(initialForm);
      setPhotos([]);
      setPreviews([]);
    } catch (requestError) {
      const response = requestError.response?.data;
      const fieldErrors = Object.fromEntries((response?.errors || []).map((error) => [error.field, error.message]));
      setErrors(fieldErrors);
      if (!Object.keys(fieldErrors).length) setErrors({ form: response?.message || 'Could not register this textile.' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="page-shell textile-form-page">
      <Link className="back-link" to="/textiles"><ArrowLeft size={15} /> My textiles</Link>
      <div className="page-heading">
        <span className="eyebrow">TEXTILE INTAKE / 01</span>
        <h1>Register a textile</h1>
        <p>Share what you know. Unknown material or condition is okay.</p>
      </div>

      {success && (
        <div className="form-success" role="status">
          <span>Textile registered</span>
          <strong>{success.refId}</strong>
          <Link to={`/textiles/${success._id}`}>Open textile record <ArrowRight size={15} /></Link>
        </div>
      )}

      <form className="textile-form" onSubmit={submit} noValidate>
        {errors.form && <div className="form-error" role="alert">{errors.form}</div>}
        <div className="form-section-heading"><span>01</span><h2>Textile details</h2></div>
        <div className="textile-form-grid">
          <div className="field-block field-wide">
            <label htmlFor="itemType">What are you registering?</label>
            <input id="itemType" name="itemType" className="form-control" placeholder="e.g. Cotton shirts, denim jeans" value={form.itemType} onChange={update} maxLength={100} aria-invalid={Boolean(errors.itemType)} />
            {errors.itemType && <span className="field-error">{errors.itemType}</span>}
          </div>
          <div className="field-block">
            <label htmlFor="material">Material</label>
            <select id="material" name="material" className="form-select" value={form.material} onChange={update}>
              {MATERIALS.map((material) => <option key={material.value} value={material.value}>{material.label}</option>)}
            </select>
          </div>
          <div className="field-block">
            <label htmlFor="condition">Condition</label>
            <select id="condition" name="condition" className="form-select" value={form.condition} onChange={update}>
              {CONDITIONS.map((condition) => <option key={condition.value} value={condition.value}>{condition.label}</option>)}
            </select>
          </div>
          <div className="field-block">
            <label htmlFor="quantity">Quantity</label>
            <div className="quantity-row">
              <input id="quantity" name="quantity" type="number" min="1" step="any" className="form-control" value={form.quantity} onChange={update} aria-invalid={Boolean(errors.quantity)} />
              <select name="quantityUnit" aria-label="Quantity unit" className="form-select" value={form.quantityUnit} onChange={update}>
                {QUANTITY_UNITS.map((unit) => <option key={unit.value} value={unit.value}>{unit.label}</option>)}
              </select>
            </div>
            {errors.quantity && <span className="field-error">{errors.quantity}</span>}
          </div>
          <div className="field-block">
            <label htmlFor="estimatedWeightKg">Approx. weight <span>(optional, kg)</span></label>
            <input id="estimatedWeightKg" name="estimatedWeightKg" type="number" min="0" step="0.1" className="form-control" placeholder="0.0" value={form.estimatedWeightKg} onChange={update} aria-invalid={Boolean(errors.estimatedWeightKg)} />
            {errors.estimatedWeightKg && <span className="field-error">{errors.estimatedWeightKg}</span>}
          </div>
        </div>

        <div className="form-section-heading section-spaced"><span>02</span><h2>Where is it?</h2></div>
        <div className="textile-form-grid location-grid">
          <div className="field-block">
            <label htmlFor="city">City</label>
            <input id="city" name="city" className="form-control" value={form.city} onChange={update} maxLength={100} aria-invalid={Boolean(errors.city || errors['location.city'])} />
            {(errors.city || errors['location.city']) && <span className="field-error">{errors.city || errors['location.city']}</span>}
          </div>
          <div className="field-block">
            <label htmlFor="state">State <span>(optional)</span></label>
            <input id="state" name="state" className="form-control" value={form.state} onChange={update} maxLength={100} />
          </div>
        </div>

        <div className="form-section-heading section-spaced"><span>03</span><h2>Photos <span>(optional)</span></h2></div>
        <label className="photo-dropzone" htmlFor="photos">
          <ImagePlus size={21} />
          <span><strong>Add photos</strong><small>JPG, PNG or WEBP · up to 5 photos · 5 MB each</small></span>
          <input id="photos" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={choosePhotos} />
        </label>
        {errors.photos && <span className="field-error photo-error">{errors.photos}</span>}
        {previews.length > 0 && (
          <div className="photo-preview-grid">
            {previews.map((preview, index) => (
              <div className="photo-preview" key={`${preview}-${index}`}>
                <img src={preview} alt={`Selected textile ${index + 1}`} />
                <button type="button" onClick={() => removePhoto(index)} aria-label={`Remove photo ${index + 1}`}><X size={15} /></button>
              </div>
            ))}
          </div>
        )}

        <div className="form-actions">
          <span>Recommendations can be added after registration.</span>
          <button className="submit-button" type="submit" disabled={saving}>
            {saving ? 'Registering...' : 'Register textile'} {!saving && <ArrowRight size={16} />}
          </button>
        </div>
      </form>
    </section>
  );
}