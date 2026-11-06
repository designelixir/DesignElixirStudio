'use client';

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  // Text shown next to the switch; can differ for on/off, e.g. "Purchase" / "Credit"
  label?: string;
  offLabel?: string;
  disabled?: boolean;
  form?: string; // id of a <form> outside the table this input belongs to
  ariaLabel?: string;
}

// On/off switch using the .switch / .slider styles in backend.css
export default function Toggle({ checked, onChange, label, offLabel, disabled, form, ariaLabel }: ToggleProps) {
  const text = checked ? label : offLabel ?? label;
  return (
    <div className='flex-center-center flex-column switch-wrapper no-flex-grow' style={{ gap: '8px', flex: 'none' }}>
      <label className='switch' style={{ opacity: disabled ? 0.6 : 1, marginBottom: 'unset' }}>
        <input
          type='checkbox'
          form={form}
          checked={checked}
          disabled={disabled}
          aria-label={ariaLabel ?? label}
          onChange={(e) => onChange(e.target.checked)}
          
        />
        <span className='slider'></span>
      </label>
      {text && <p className="switch-label">{text}</p>}
    </div>
  );
}
