'use client';

import { useEffect, useState } from 'react';
import {
  OTHER_PROVINCE_VALUE,
  ZIMBABWE_PROVINCES,
  isKnownZimbabweProvince,
} from '@/lib/zimbabweProvinces';

type ProvinceFieldProps = {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  className?: string;
  labelClassName?: string;
  id?: string;
  label?: string;
};

/**
 * Province select for Zimbabwe provinces, with an Other option for diaspora /
 * additional regions the member types in.
 */
export function ProvinceField({
  value,
  onChange,
  required,
  className,
  labelClassName = 'mb-1 block text-sm font-medium text-neutral-700',
  id = 'province',
  label = 'Province',
}: ProvinceFieldProps) {
  const known = isKnownZimbabweProvince(value);
  const [mode, setMode] = useState<'known' | 'other'>(!value || known ? 'known' : 'other');
  const [custom, setCustom] = useState(!value || known ? '' : value);

  useEffect(() => {
    if (!value) {
      setMode('known');
      setCustom('');
      return;
    }
    if (isKnownZimbabweProvince(value)) {
      setMode('known');
      setCustom('');
    } else {
      setMode('other');
      setCustom(value);
    }
  }, [value]);

  const selectValue = mode === 'other' ? OTHER_PROVINCE_VALUE : value;

  return (
    <div className="space-y-2">
      <div>
        <label htmlFor={id} className={labelClassName}>
          {label}
          {required ? <span className="text-red-600"> *</span> : null}
        </label>
        <select
          id={id}
          value={selectValue}
          required={required && mode === 'known'}
          onChange={(e) => {
            const next = e.target.value;
            if (next === OTHER_PROVINCE_VALUE) {
              setMode('other');
              onChange(custom.trim());
              return;
            }
            setMode('known');
            setCustom('');
            onChange(next);
          }}
          className={className}
        >
          <option value="">{required ? 'Select province' : '—'}</option>
          {ZIMBABWE_PROVINCES.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
          <option value={OTHER_PROVINCE_VALUE}>Other / Diaspora…</option>
        </select>
      </div>
      {mode === 'other' ? (
        <div>
          <label htmlFor={`${id}-other`} className={labelClassName}>
            Province / region (diaspora or other)
          </label>
          <input
            id={`${id}-other`}
            value={custom}
            required={required}
            placeholder="e.g. Gauteng, Greater London, Ontario"
            onChange={(e) => {
              setCustom(e.target.value);
              onChange(e.target.value);
            }}
            className={className}
          />
        </div>
      ) : null}
    </div>
  );
}
