import { useState, useEffect } from 'react';

export interface TinderCardConfig {
  photoField: string;
  mainFields: string[];
  detailFields: string[];
  badgeFields: string[];
}

const STORAGE_KEY = 'tinder_card_config';

const DEFAULT_CONFIG: TinderCardConfig = {
  photoField: 'foto',
  mainFields: ['nome', 'age'],
  detailFields: ['scouter', 'local_da_abordagem', 'projetos', 'supervisor'],
  badgeFields: ['ficha_confirmada', 'presenca_confirmada', 'etapa']
};

const VALIDATION = {
  mainFields: { min: 1, max: 2 },
  detailFields: { max: 6 },
  badgeFields: { max: 5 }
};

export const useTinderCardConfig = () => {
  const [config, setConfig] = useState<TinderCardConfig>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return DEFAULT_CONFIG;
      }
    }
    return DEFAULT_CONFIG;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  }, [config]);

  const setPhotoField = (field: string) => {
    setConfig(prev => ({ ...prev, photoField: field }));
  };

  const addMainField = (field: string) => {
    setConfig(prev => {
      if (prev.mainFields.length >= VALIDATION.mainFields.max) {
        return prev;
      }
      if (prev.mainFields.includes(field)) {
        return prev;
      }
      return {
        ...prev,
        mainFields: [...prev.mainFields, field]
      };
    });
  };

  const removeMainField = (field: string) => {
    setConfig(prev => {
      if (prev.mainFields.length <= VALIDATION.mainFields.min) {
        return prev;
      }
      return {
        ...prev,
        mainFields: prev.mainFields.filter(f => f !== field)
      };
    });
  };

  const addDetailField = (field: string) => {
    setConfig(prev => {
      if (prev.detailFields.length >= VALIDATION.detailFields.max) {
        return prev;
      }
      if (prev.detailFields.includes(field)) {
        return prev;
      }
      return {
        ...prev,
        detailFields: [...prev.detailFields, field]
      };
    });
  };

  const removeDetailField = (field: string) => {
    setConfig(prev => ({
      ...prev,
      detailFields: prev.detailFields.filter(f => f !== field)
    }));
  };

  const addBadgeField = (field: string) => {
    setConfig(prev => {
      if (prev.badgeFields.length >= VALIDATION.badgeFields.max) {
        return prev;
      }
      if (prev.badgeFields.includes(field)) {
        return prev;
      }
      return {
        ...prev,
        badgeFields: [...prev.badgeFields, field]
      };
    });
  };

  const removeBadgeField = (field: string) => {
    setConfig(prev => ({
      ...prev,
      badgeFields: prev.badgeFields.filter(f => f !== field)
    }));
  };

  const resetToDefault = () => {
    setConfig(DEFAULT_CONFIG);
  };

  const canAddMainField = () => config.mainFields.length < VALIDATION.mainFields.max;
  const canRemoveMainField = () => config.mainFields.length > VALIDATION.mainFields.min;
  const canAddDetailField = () => config.detailFields.length < VALIDATION.detailFields.max;
  const canAddBadgeField = () => config.badgeFields.length < VALIDATION.badgeFields.max;

  return {
    config,
    setPhotoField,
    addMainField,
    removeMainField,
    addDetailField,
    removeDetailField,
    addBadgeField,
    removeBadgeField,
    resetToDefault,
    canAddMainField,
    canRemoveMainField,
    canAddDetailField,
    canAddBadgeField,
    validation: VALIDATION
  };
};
