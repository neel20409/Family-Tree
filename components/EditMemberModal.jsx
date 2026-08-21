import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { saveMemberEdit, validatePhotoFile } from '../src/memberEdits';
import { isFirebaseConfigured } from '../src/firebase';

function toISODateInput(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date)) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function initialDeathStatus(deathDate) {
  if (deathDate === '--') return 'living';
  if (!deathDate || deathDate === 'unknown') return 'unknown';
  const iso = toISODateInput(deathDate);
  return iso ? 'deceased' : 'unknown';
}

export default function EditMemberModal({ member, currentPhotoSrc, isGujarati, t, onClose, onSaved }) {
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(currentPhotoSrc);
  const [birthUnknown, setBirthUnknown] = useState(!toISODateInput(member.birthDate));
  const [birthISO, setBirthISO] = useState(toISODateInput(member.birthDate));
  const [deathStatus, setDeathStatus] = useState(initialDeathStatus(member.deathDate));
  const [deathISO, setDeathISO] = useState(toISODateInput(member.deathDate));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const objectUrlRef = useRef(null);

  useEffect(() => () => {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validationError = validatePhotoFile(file);
    if (validationError) {
      setError(validationError);
      e.target.value = '';
      return;
    }
    setError(null);
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;
    setPhotoFile(file);
    setPhotoPreview(url);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const birthDate = birthUnknown ? 'unknown' : (birthISO || 'unknown');
      const deathDate = deathStatus === 'living' ? '--' : deathStatus === 'unknown' ? 'unknown' : (deathISO || 'unknown');
      const saved = await saveMemberEdit(member.id, { photoFile, birthDate, deathDate });
      onSaved(member.id, saved);
      onClose();
    } catch (err) {
      setError(err.message || 'Something went wrong -- please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      className="modal-overlay"
      onClick={onClose}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
    >
      <motion.div
        className="edit-member-modal card-glass"
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      >
        <button className="modal-close" onClick={onClose} aria-label={t('close')}>&times;</button>
        <h2>{t('editMember')}</h2>
        <p className="edit-member-name">{isGujarati && member.gujaratiName ? member.gujaratiName : member.name}</p>

        {!isFirebaseConfigured && (
          <p className="edit-member-error">Editing isn’t available on this deployment yet.</p>
        )}

        <div className="edit-member-photo-row">
          <div className="edit-member-photo-preview">
            {photoPreview ? <img src={photoPreview} alt="" /> : <span>{member.name?.substring(0, 2).toUpperCase()}</span>}
          </div>
          <label className="drawer-action-btn">
            {t('changePhoto')}
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileChange} hidden />
          </label>
        </div>

        <div className="edit-member-field">
          <span className="date-label">{t('birthDateLabel')}</span>
          <div className="edit-member-field-row">
            <input
              type="date"
              value={birthISO}
              disabled={birthUnknown}
              onChange={(e) => setBirthISO(e.target.value)}
            />
            <label className="edit-member-checkbox">
              <input
                type="checkbox"
                checked={birthUnknown}
                onChange={(e) => setBirthUnknown(e.target.checked)}
              />
              {t('unknown')}
            </label>
          </div>
        </div>

        <div className="edit-member-field">
          <span className="date-label">{t('passed')}</span>
          <div className="edit-member-field-row">
            <select value={deathStatus} onChange={(e) => setDeathStatus(e.target.value)}>
              <option value="deceased">{t('deceased')}</option>
              <option value="living">{t('living')}</option>
              <option value="unknown">{t('unknown')}</option>
            </select>
            {deathStatus === 'deceased' && (
              <input type="date" value={deathISO} onChange={(e) => setDeathISO(e.target.value)} />
            )}
          </div>
        </div>

        {error && <p className="edit-member-error">{error}</p>}

        <div className="edit-member-actions">
          <button className="drawer-action-btn" onClick={onClose} disabled={saving}>{t('cancel')}</button>
          <button
            className="drawer-action-btn primary"
            onClick={handleSave}
            disabled={saving || !isFirebaseConfigured}
          >
            {saving ? t('saving') : t('save')}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
