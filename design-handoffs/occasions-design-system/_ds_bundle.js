/* @ds-bundle: {"format":3,"namespace":"AIBizConnectDesignSystem_d948fa","components":[{"name":"Avatar","sourcePath":"components/core/Avatar.jsx"},{"name":"Badge","sourcePath":"components/core/Badge.jsx"},{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"Card","sourcePath":"components/core/Card.jsx"},{"name":"CardHeader","sourcePath":"components/core/Card.jsx"},{"name":"IconButton","sourcePath":"components/core/IconButton.jsx"},{"name":"Alert","sourcePath":"components/data/Alert.jsx"},{"name":"Stat","sourcePath":"components/data/Stat.jsx"},{"name":"Tabs","sourcePath":"components/data/Tabs.jsx"},{"name":"Checkbox","sourcePath":"components/forms/Checkbox.jsx"},{"name":"Input","sourcePath":"components/forms/Input.jsx"},{"name":"Select","sourcePath":"components/forms/Select.jsx"},{"name":"Switch","sourcePath":"components/forms/Switch.jsx"}],"sourceHashes":{"components/core/Avatar.jsx":"b8ac734e6a83","components/core/Badge.jsx":"02968ccfc370","components/core/Button.jsx":"4033b441faec","components/core/Card.jsx":"5f7d5d817335","components/core/IconButton.jsx":"db13f8e1333b","components/data/Alert.jsx":"023a7d0822a8","components/data/Stat.jsx":"4d0e852e5f24","components/data/Tabs.jsx":"8a14282881fb","components/forms/Checkbox.jsx":"7a7ef1bea40b","components/forms/Input.jsx":"9bdcd31bb657","components/forms/Select.jsx":"029ce43f0e36","components/forms/Switch.jsx":"8e44f44d5e90","ui_kits/marketing/Hero.jsx":"250d613324f6","ui_kits/marketing/Sections.jsx":"ead764cecf42","ui_kits/marketing/icons.jsx":"7691da66860d","ui_kits/mobile/Mobile.jsx":"59248b06f832","ui_kits/mobile/icons.jsx":"7691da66860d","ui_kits/mobile/ios-frame.jsx":"be3343be4b51","ui_kits/seo-geo/GeoVisibility.jsx":"fc7b04745ee6","ui_kits/seo-geo/SGApp.jsx":"8e393ea1176f","ui_kits/seo-geo/SGAuth.jsx":"d66b6868a640","ui_kits/seo-geo/SGBacklinks.jsx":"a1a32e1ad8d9","ui_kits/seo-geo/SGCompetitors.jsx":"ac7c31d4d902","ui_kits/seo-geo/SGDashboard.jsx":"42ff6a36b5ee","ui_kits/seo-geo/SGKeywords.jsx":"4cc2e645d217","ui_kits/seo-geo/SGRankTracking.jsx":"480536268a19","ui_kits/seo-geo/SGReports.jsx":"cc89239a08ee","ui_kits/seo-geo/SGSidebar.jsx":"0be5f734096d","ui_kits/seo-geo/SGSiteAudit.jsx":"54062efd9859","ui_kits/seo-geo/SGTopBar.jsx":"4d18a3f6aecb","ui_kits/seo-geo/icons.jsx":"5ae478c2b4c8","ui_kits/seo-geo/kit.jsx":"b88dc0279f65","ui_kits/web-app/App.jsx":"2266b671b3b8","ui_kits/web-app/Contacts.jsx":"78d026e8e026","ui_kits/web-app/Dashboard.jsx":"f376507667b3","ui_kits/web-app/Pipeline.jsx":"85dcfd6c20b2","ui_kits/web-app/Sidebar.jsx":"48c580fad69c","ui_kits/web-app/TopBar.jsx":"6ee5f3937dbc","ui_kits/web-app/icons.jsx":"7691da66860d"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.AIBizConnectDesignSystem_d948fa = window.AIBizConnectDesignSystem_d948fa || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/core/Avatar.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const SIZES = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 52,
  xl: 72
};
function initials(name = '') {
  const p = name.trim().split(/\s+/);
  return ((p[0]?.[0] || '') + (p[1]?.[0] || '')).toUpperCase() || '?';
}
function Avatar({
  name = '',
  src,
  size = 'md',
  status,
  style,
  ...rest
}) {
  const dim = SIZES[size] || SIZES.md;
  const fontSize = Math.round(dim * 0.4);
  const statusColor = {
    online: 'var(--success)',
    away: 'var(--warning)',
    offline: 'var(--gray-400)'
  }[status];
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      position: 'relative',
      display: 'inline-flex',
      flex: 'none',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("span", {
    style: {
      width: dim,
      height: dim,
      borderRadius: '50%',
      overflow: 'hidden',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: src ? 'var(--gray-200)' : 'var(--gradient-brand)',
      color: 'var(--white)',
      fontFamily: 'var(--font-display)',
      fontWeight: 'var(--weight-semibold)',
      fontSize,
      letterSpacing: '0.01em',
      userSelect: 'none'
    }
  }, src ? /*#__PURE__*/React.createElement("img", {
    src: src,
    alt: name,
    style: {
      width: '100%',
      height: '100%',
      objectFit: 'cover'
    }
  }) : initials(name)), statusColor && /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      right: 0,
      bottom: 0,
      width: Math.max(8, dim * 0.26),
      height: Math.max(8, dim * 0.26),
      borderRadius: '50%',
      background: statusColor,
      border: '2px solid var(--surface-card)'
    }
  }));
}
Object.assign(__ds_scope, { Avatar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Avatar.jsx", error: String((e && e.message) || e) }); }

// components/core/Badge.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const TONES = {
  neutral: {
    bg: 'var(--gray-100)',
    fg: 'var(--gray-700)',
    dot: 'var(--gray-500)'
  },
  brand: {
    bg: 'var(--blue-50)',
    fg: 'var(--blue-600)',
    dot: 'var(--blue-500)'
  },
  success: {
    bg: 'var(--green-100)',
    fg: 'var(--green-600)',
    dot: 'var(--green-500)'
  },
  warning: {
    bg: 'var(--amber-100)',
    fg: 'var(--amber-600)',
    dot: 'var(--amber-500)'
  },
  danger: {
    bg: 'var(--red-100)',
    fg: 'var(--red-600)',
    dot: 'var(--red-500)'
  }
};
function Badge({
  children,
  tone = 'neutral',
  dot = false,
  solid = false,
  style,
  ...rest
}) {
  const t = TONES[tone] || TONES.neutral;
  const base = solid ? {
    background: t.dot,
    color: 'var(--white)'
  } : {
    background: t.bg,
    color: t.fg
  };
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      height: 22,
      padding: '0 9px',
      borderRadius: 'var(--radius-pill)',
      fontFamily: 'var(--font-sans)',
      fontSize: 'var(--text-xs)',
      fontWeight: 'var(--weight-semibold)',
      letterSpacing: 'var(--tracking-snug)',
      lineHeight: 1,
      whiteSpace: 'nowrap',
      ...base,
      ...style
    }
  }, rest), dot && /*#__PURE__*/React.createElement("span", {
    style: {
      width: 6,
      height: 6,
      borderRadius: '50%',
      background: solid ? 'var(--white)' : t.dot,
      flex: 'none'
    }
  }), children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Badge.jsx", error: String((e && e.message) || e) }); }

// components/core/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const {
  useState
} = React;
const SIZES = {
  sm: {
    height: 'var(--control-h-sm)',
    padding: '0 14px',
    fontSize: 'var(--text-sm)',
    gap: '6px',
    radius: 'var(--radius-sm)'
  },
  md: {
    height: 'var(--control-h-md)',
    padding: '0 18px',
    fontSize: 'var(--text-sm)',
    gap: '8px',
    radius: 'var(--radius-md)'
  },
  lg: {
    height: 'var(--control-h-lg)',
    padding: '0 24px',
    fontSize: 'var(--text-base)',
    gap: '8px',
    radius: 'var(--radius-md)'
  }
};
function palette(variant, hover, active) {
  switch (variant) {
    case 'secondary':
      return {
        background: hover ? 'var(--gray-50)' : 'var(--surface-card)',
        color: 'var(--text-strong)',
        border: '1px solid var(--border-default)',
        boxShadow: active ? 'none' : 'var(--shadow-xs)'
      };
    case 'ghost':
      return {
        background: hover ? 'var(--blue-50)' : 'transparent',
        color: 'var(--color-primary)',
        border: '1px solid transparent',
        boxShadow: 'none'
      };
    case 'danger':
      return {
        background: active ? 'var(--red-600)' : hover ? '#cf3640' : 'var(--danger)',
        color: 'var(--white)',
        border: '1px solid transparent',
        boxShadow: active ? 'none' : 'var(--shadow-sm)'
      };
    case 'primary':
    default:
      return {
        background: active ? 'var(--color-primary-active)' : hover ? 'var(--color-primary-hover)' : 'var(--color-primary)',
        color: 'var(--color-primary-contrast)',
        border: '1px solid transparent',
        boxShadow: active ? 'none' : 'var(--shadow-brand)'
      };
  }
}
function Button({
  children,
  variant = 'primary',
  size = 'md',
  leftIcon,
  rightIcon,
  fullWidth = false,
  disabled = false,
  loading = false,
  type = 'button',
  as = 'button',
  href,
  onClick,
  style,
  ...rest
}) {
  const [hover, setHover] = useState(false);
  const [active, setActive] = useState(false);
  const s = SIZES[size] || SIZES.md;
  const pal = palette(variant, hover && !disabled, active && !disabled);
  const Tag = as === 'a' || href ? 'a' : 'button';
  const css = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: s.gap,
    height: s.height,
    padding: s.padding,
    fontSize: s.fontSize,
    fontFamily: 'var(--font-sans)',
    fontWeight: 'var(--weight-semibold)',
    letterSpacing: 'var(--tracking-snug)',
    lineHeight: 1,
    borderRadius: s.radius,
    width: fullWidth ? '100%' : 'auto',
    cursor: disabled || loading ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    textDecoration: 'none',
    whiteSpace: 'nowrap',
    transform: active && !disabled ? 'translateY(0.5px) scale(0.99)' : 'none',
    transition: 'background var(--dur-fast) var(--ease-out), box-shadow var(--dur-fast) var(--ease-out), transform var(--dur-fast) var(--ease-out)',
    ...pal,
    ...style
  };
  return /*#__PURE__*/React.createElement(Tag, _extends({
    type: Tag === 'button' ? type : undefined,
    href: href,
    style: css,
    disabled: Tag === 'button' ? disabled || loading : undefined,
    onClick: disabled || loading ? undefined : onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => {
      setHover(false);
      setActive(false);
    },
    onMouseDown: () => setActive(true),
    onMouseUp: () => setActive(false)
  }, rest), loading && /*#__PURE__*/React.createElement(Spinner, null), !loading && leftIcon && /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex'
    }
  }, leftIcon), children, !loading && rightIcon && /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex'
    }
  }, rightIcon));
}
function Spinner() {
  return /*#__PURE__*/React.createElement("span", {
    style: {
      width: 15,
      height: 15,
      borderRadius: '50%',
      border: '2px solid currentColor',
      borderTopColor: 'transparent',
      display: 'inline-block',
      animation: 'abc-spin 0.6s linear infinite'
    }
  }, /*#__PURE__*/React.createElement("style", null, '@keyframes abc-spin{to{transform:rotate(360deg)}}'));
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/core/Card.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Card({
  children,
  padding = 'md',
  interactive = false,
  style,
  ...rest
}) {
  const pad = {
    none: 0,
    sm: 'var(--space-4)',
    md: 'var(--space-6)',
    lg: 'var(--space-8)'
  }[padding] ?? 'var(--space-6)';
  const [hover, setHover] = React.useState(false);
  return /*#__PURE__*/React.createElement("div", _extends({
    onMouseEnter: interactive ? () => setHover(true) : undefined,
    onMouseLeave: interactive ? () => setHover(false) : undefined,
    style: {
      background: 'var(--surface-card)',
      borderRadius: 'var(--radius-lg)',
      border: '1px solid var(--border-subtle)',
      boxShadow: hover ? 'var(--shadow-lg)' : 'var(--shadow-sm)',
      padding: pad,
      cursor: interactive ? 'pointer' : 'default',
      transform: hover ? 'translateY(-2px)' : 'none',
      transition: 'box-shadow var(--dur-base) var(--ease-out), transform var(--dur-base) var(--ease-out)',
      ...style
    }
  }, rest), children);
}
function CardHeader({
  title,
  subtitle,
  action,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 'var(--space-4)',
      marginBottom: 'var(--space-4)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 'var(--weight-semibold)',
      fontSize: 'var(--text-md)',
      color: 'var(--text-heading)',
      letterSpacing: 'var(--tracking-snug)'
    }
  }, title), subtitle && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--text-sm)',
      color: 'var(--text-muted)',
      marginTop: 2
    }
  }, subtitle)), action);
}
Object.assign(__ds_scope, { Card, CardHeader });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Card.jsx", error: String((e && e.message) || e) }); }

// components/core/IconButton.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const {
  useState
} = React;
const SIZES = {
  sm: 34,
  md: 42,
  lg: 52
};
function IconButton({
  children,
  label,
  variant = 'secondary',
  size = 'md',
  disabled = false,
  onClick,
  style,
  ...rest
}) {
  const [hover, setHover] = useState(false);
  const [active, setActive] = useState(false);
  const dim = SIZES[size] || SIZES.md;
  let pal;
  if (variant === 'primary') {
    pal = {
      background: active ? 'var(--color-primary-active)' : hover ? 'var(--color-primary-hover)' : 'var(--color-primary)',
      color: 'var(--white)',
      border: '1px solid transparent',
      boxShadow: active ? 'none' : 'var(--shadow-brand)'
    };
  } else if (variant === 'ghost') {
    pal = {
      background: hover ? 'var(--blue-50)' : 'transparent',
      color: 'var(--color-primary)',
      border: '1px solid transparent',
      boxShadow: 'none'
    };
  } else {
    pal = {
      background: hover ? 'var(--gray-50)' : 'var(--surface-card)',
      color: 'var(--text-body)',
      border: '1px solid var(--border-default)',
      boxShadow: active ? 'none' : 'var(--shadow-xs)'
    };
  }
  return /*#__PURE__*/React.createElement("button", _extends({
    type: "button",
    "aria-label": label,
    title: label,
    disabled: disabled,
    onClick: disabled ? undefined : onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => {
      setHover(false);
      setActive(false);
    },
    onMouseDown: () => setActive(true),
    onMouseUp: () => setActive(false),
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: dim,
      height: dim,
      borderRadius: 'var(--radius-md)',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1,
      padding: 0,
      flex: 'none',
      transform: active && !disabled ? 'scale(0.95)' : 'none',
      transition: 'background var(--dur-fast) var(--ease-out), transform var(--dur-fast) var(--ease-out)',
      ...pal,
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { IconButton });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/IconButton.jsx", error: String((e && e.message) || e) }); }

// components/data/Alert.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const TONES = {
  info: {
    bg: 'var(--blue-50)',
    border: 'var(--blue-200)',
    fg: 'var(--blue-700)',
    icon: 'var(--blue-500)'
  },
  success: {
    bg: 'var(--green-100)',
    border: '#bfe6d4',
    fg: 'var(--green-600)',
    icon: 'var(--green-500)'
  },
  warning: {
    bg: 'var(--amber-100)',
    border: '#f0dca6',
    fg: 'var(--amber-600)',
    icon: 'var(--amber-500)'
  },
  danger: {
    bg: 'var(--red-100)',
    border: '#f3c5c8',
    fg: 'var(--red-600)',
    icon: 'var(--red-500)'
  }
};
const PATHS = {
  info: 'M12 16v-5M12 8h.01M12 3a9 9 0 100 18 9 9 0 000-18z',
  success: 'M20 6L9 17l-5-5',
  warning: 'M12 9v4M12 17h.01M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L14.7 3.9a2 2 0 00-3.4 0z',
  danger: 'M12 8v5M12 16h.01M12 3a9 9 0 100 18 9 9 0 000-18z'
};
function Alert({
  tone = 'info',
  title,
  children,
  onClose,
  style,
  ...rest
}) {
  const t = TONES[tone] || TONES.info;
  return /*#__PURE__*/React.createElement("div", _extends({
    role: "alert",
    style: {
      display: 'flex',
      gap: 12,
      padding: 'var(--space-4)',
      background: t.bg,
      border: `1px solid ${t.border}`,
      borderRadius: 'var(--radius-md)',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("svg", {
    width: "20",
    height: "20",
    viewBox: "0 0 24 24",
    fill: "none",
    style: {
      flex: 'none',
      color: t.icon,
      marginTop: 1
    }
  }, /*#__PURE__*/React.createElement("path", {
    d: PATHS[tone],
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, title && /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontWeight: 'var(--weight-semibold)',
      fontSize: 'var(--text-sm)',
      color: t.fg,
      marginBottom: children ? 3 : 0
    }
  }, title), children && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--text-sm)',
      color: 'var(--text-body)',
      lineHeight: 1.5
    }
  }, children)), onClose && /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    "aria-label": "Dismiss",
    style: {
      flex: 'none',
      border: 'none',
      background: 'transparent',
      cursor: 'pointer',
      color: t.fg,
      padding: 2,
      display: 'inline-flex',
      opacity: 0.7
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "16",
    height: "16",
    viewBox: "0 0 24 24",
    fill: "none"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M6 6l12 12M18 6L6 18",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round"
  }))));
}
Object.assign(__ds_scope, { Alert });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/Alert.jsx", error: String((e && e.message) || e) }); }

// components/data/Stat.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Stat({
  label,
  value,
  delta,
  deltaDirection,
  icon,
  style,
  ...rest
}) {
  const dir = deltaDirection || (delta && String(delta).trim().startsWith('-') ? 'down' : 'up');
  const positive = dir === 'up';
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8
    }
  }, icon && /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: 30,
      height: 30,
      borderRadius: 'var(--radius-sm)',
      background: 'var(--blue-50)',
      color: 'var(--color-primary)'
    }
  }, icon), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-sm)',
      fontWeight: 'var(--weight-semibold)',
      color: 'var(--text-muted)',
      letterSpacing: 'var(--tracking-snug)'
    }
  }, label)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'baseline',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 'var(--weight-semibold)',
      fontSize: 'var(--text-3xl)',
      color: 'var(--text-heading)',
      letterSpacing: 'var(--tracking-tight)',
      lineHeight: 1
    }
  }, value), delta != null && /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 2,
      fontSize: 'var(--text-sm)',
      fontWeight: 'var(--weight-semibold)',
      color: positive ? 'var(--green-600)' : 'var(--red-600)'
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "14",
    height: "14",
    viewBox: "0 0 24 24",
    fill: "none",
    style: {
      transform: positive ? 'none' : 'rotate(180deg)'
    }
  }, /*#__PURE__*/React.createElement("path", {
    d: "M12 19V5M5 12l7-7 7 7",
    stroke: "currentColor",
    strokeWidth: "2.4",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  })), String(delta).replace(/^-/, ''))));
}
Object.assign(__ds_scope, { Stat });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/Stat.jsx", error: String((e && e.message) || e) }); }

// components/data/Tabs.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const {
  useState
} = React;
function Tabs({
  tabs = [],
  value,
  defaultValue,
  onChange,
  style,
  ...rest
}) {
  const isControlled = value !== undefined;
  const [internal, setInternal] = useState(defaultValue ?? tabs[0]?.value);
  const active = isControlled ? value : internal;
  const select = v => {
    if (!isControlled) setInternal(v);
    onChange?.(v);
  };
  return /*#__PURE__*/React.createElement("div", _extends({
    role: "tablist",
    style: {
      display: 'inline-flex',
      gap: 4,
      padding: 4,
      background: 'var(--surface-sunken)',
      borderRadius: 'var(--radius-md)',
      ...style
    }
  }, rest), tabs.map(t => {
    const on = t.value === active;
    return /*#__PURE__*/React.createElement("button", {
      key: t.value,
      role: "tab",
      "aria-selected": on,
      onClick: () => select(t.value),
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 7,
        height: 34,
        padding: '0 14px',
        border: 'none',
        borderRadius: 'var(--radius-sm)',
        cursor: 'pointer',
        fontFamily: 'var(--font-sans)',
        fontSize: 'var(--text-sm)',
        fontWeight: 'var(--weight-semibold)',
        background: on ? 'var(--surface-card)' : 'transparent',
        color: on ? 'var(--color-primary)' : 'var(--text-muted)',
        boxShadow: on ? 'var(--shadow-xs)' : 'none',
        transition: 'background var(--dur-fast) var(--ease-out), color var(--dur-fast) var(--ease-out)'
      }
    }, t.icon && /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'inline-flex'
      }
    }, t.icon), t.label, t.count != null && /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 11,
        fontWeight: 700,
        padding: '1px 6px',
        borderRadius: 'var(--radius-pill)',
        background: on ? 'var(--blue-50)' : 'var(--gray-200)',
        color: on ? 'var(--color-primary)' : 'var(--text-muted)'
      }
    }, t.count));
  }));
}
Object.assign(__ds_scope, { Tabs });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/Tabs.jsx", error: String((e && e.message) || e) }); }

// components/forms/Checkbox.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Checkbox({
  label,
  description,
  checked,
  defaultChecked,
  onChange,
  disabled = false,
  id,
  style,
  ...rest
}) {
  const isControlled = checked !== undefined;
  const [internal, setInternal] = React.useState(defaultChecked || false);
  const on = isControlled ? checked : internal;
  const fieldId = id || (label ? `cb-${String(label).replace(/\s+/g, '-').toLowerCase()}` : undefined);
  const toggle = e => {
    if (disabled) return;
    if (!isControlled) setInternal(e.target.checked);
    onChange?.(e);
  };
  return /*#__PURE__*/React.createElement("label", {
    htmlFor: fieldId,
    style: {
      display: 'flex',
      alignItems: description ? 'flex-start' : 'center',
      gap: 10,
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.6 : 1,
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'relative',
      display: 'inline-flex',
      flex: 'none',
      marginTop: description ? 1 : 0
    }
  }, /*#__PURE__*/React.createElement("input", _extends({
    type: "checkbox",
    id: fieldId,
    checked: isControlled ? checked : undefined,
    defaultChecked: isControlled ? undefined : defaultChecked,
    onChange: toggle,
    disabled: disabled,
    style: {
      position: 'absolute',
      opacity: 0,
      width: 20,
      height: 20,
      margin: 0,
      cursor: 'inherit'
    }
  }, rest)), /*#__PURE__*/React.createElement("span", {
    style: {
      width: 20,
      height: 20,
      borderRadius: 'var(--radius-xs)',
      border: `1.5px solid ${on ? 'var(--color-primary)' : 'var(--border-strong)'}`,
      background: on ? 'var(--color-primary)' : 'var(--surface-card)',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'background var(--dur-fast) var(--ease-out), border-color var(--dur-fast) var(--ease-out)'
    }
  }, on && /*#__PURE__*/React.createElement("svg", {
    width: "13",
    height: "13",
    viewBox: "0 0 24 24",
    fill: "none"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M5 12.5l4.2 4.2L19 7",
    stroke: "white",
    strokeWidth: "2.6",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  })))), label && /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 2
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-sm)',
      fontWeight: 'var(--weight-medium)',
      color: 'var(--text-strong)',
      lineHeight: 1.4
    }
  }, label), description && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-xs)',
      color: 'var(--text-muted)',
      lineHeight: 1.4
    }
  }, description)));
}
Object.assign(__ds_scope, { Checkbox });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Checkbox.jsx", error: String((e && e.message) || e) }); }

// components/forms/Input.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const {
  useState
} = React;
function Input({
  label,
  hint,
  error,
  leftIcon,
  rightIcon,
  size = 'md',
  id,
  disabled = false,
  style,
  containerStyle,
  ...rest
}) {
  const [focus, setFocus] = useState(false);
  const height = {
    sm: 'var(--control-h-sm)',
    md: 'var(--control-h-md)',
    lg: 'var(--control-h-lg)'
  }[size];
  const fieldId = id || (label ? `in-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined);
  const borderColor = error ? 'var(--danger)' : focus ? 'var(--border-focus)' : 'var(--border-default)';
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
      ...containerStyle
    }
  }, label && /*#__PURE__*/React.createElement("label", {
    htmlFor: fieldId,
    style: {
      fontSize: 'var(--text-sm)',
      fontWeight: 'var(--weight-semibold)',
      color: 'var(--text-strong)'
    }
  }, label), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      height,
      padding: '0 12px',
      background: disabled ? 'var(--gray-100)' : 'var(--surface-card)',
      border: `1px solid ${borderColor}`,
      borderRadius: 'var(--radius-md)',
      boxShadow: focus ? 'var(--ring-focus)' : 'var(--shadow-xs)',
      transition: 'border-color var(--dur-fast) var(--ease-out), box-shadow var(--dur-fast) var(--ease-out)',
      opacity: disabled ? 0.6 : 1
    }
  }, leftIcon && /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      color: 'var(--text-muted)'
    }
  }, leftIcon), /*#__PURE__*/React.createElement("input", _extends({
    id: fieldId,
    disabled: disabled,
    onFocus: () => setFocus(true),
    onBlur: () => setFocus(false),
    style: {
      flex: 1,
      border: 'none',
      outline: 'none',
      background: 'transparent',
      fontFamily: 'var(--font-sans)',
      fontSize: 'var(--text-sm)',
      color: 'var(--text-strong)',
      minWidth: 0,
      ...style
    }
  }, rest)), rightIcon && /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      color: 'var(--text-muted)'
    }
  }, rightIcon)), (hint || error) && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-xs)',
      color: error ? 'var(--danger)' : 'var(--text-muted)'
    }
  }, error || hint));
}
Object.assign(__ds_scope, { Input });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Input.jsx", error: String((e && e.message) || e) }); }

// components/forms/Select.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const {
  useState
} = React;
function Select({
  label,
  hint,
  error,
  size = 'md',
  id,
  disabled = false,
  children,
  style,
  containerStyle,
  ...rest
}) {
  const [focus, setFocus] = useState(false);
  const height = {
    sm: 'var(--control-h-sm)',
    md: 'var(--control-h-md)',
    lg: 'var(--control-h-lg)'
  }[size];
  const fieldId = id || (label ? `sel-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined);
  const borderColor = error ? 'var(--danger)' : focus ? 'var(--border-focus)' : 'var(--border-default)';
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
      ...containerStyle
    }
  }, label && /*#__PURE__*/React.createElement("label", {
    htmlFor: fieldId,
    style: {
      fontSize: 'var(--text-sm)',
      fontWeight: 'var(--weight-semibold)',
      color: 'var(--text-strong)'
    }
  }, label), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      display: 'flex',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("select", _extends({
    id: fieldId,
    disabled: disabled,
    onFocus: () => setFocus(true),
    onBlur: () => setFocus(false),
    style: {
      appearance: 'none',
      WebkitAppearance: 'none',
      width: '100%',
      height,
      padding: '0 38px 0 12px',
      background: disabled ? 'var(--gray-100)' : 'var(--surface-card)',
      border: `1px solid ${borderColor}`,
      borderRadius: 'var(--radius-md)',
      boxShadow: focus ? 'var(--ring-focus)' : 'var(--shadow-xs)',
      fontFamily: 'var(--font-sans)',
      fontSize: 'var(--text-sm)',
      color: 'var(--text-strong)',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.6 : 1,
      outline: 'none',
      transition: 'border-color var(--dur-fast) var(--ease-out), box-shadow var(--dur-fast) var(--ease-out)',
      ...style
    }
  }, rest), children), /*#__PURE__*/React.createElement("svg", {
    width: "16",
    height: "16",
    viewBox: "0 0 24 24",
    fill: "none",
    style: {
      position: 'absolute',
      right: 12,
      pointerEvents: 'none',
      color: 'var(--text-muted)'
    }
  }, /*#__PURE__*/React.createElement("path", {
    d: "M6 9l6 6 6-6",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }))), (hint || error) && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-xs)',
      color: error ? 'var(--danger)' : 'var(--text-muted)'
    }
  }, error || hint));
}
Object.assign(__ds_scope, { Select });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Select.jsx", error: String((e && e.message) || e) }); }

// components/forms/Switch.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Switch({
  label,
  description,
  checked,
  defaultChecked,
  onChange,
  disabled = false,
  size = 'md',
  id,
  style,
  ...rest
}) {
  const isControlled = checked !== undefined;
  const [internal, setInternal] = React.useState(defaultChecked || false);
  const on = isControlled ? checked : internal;
  const fieldId = id || (label ? `sw-${String(label).replace(/\s+/g, '-').toLowerCase()}` : undefined);
  const W = size === 'sm' ? 34 : 44,
    H = size === 'sm' ? 20 : 26,
    K = H - 6;
  const toggle = e => {
    if (disabled) return;
    if (!isControlled) setInternal(e.target.checked);
    onChange?.(e);
  };
  return /*#__PURE__*/React.createElement("label", {
    htmlFor: fieldId,
    style: {
      display: 'flex',
      alignItems: description ? 'flex-start' : 'center',
      gap: 12,
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.6 : 1,
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'relative',
      display: 'inline-flex',
      flex: 'none'
    }
  }, /*#__PURE__*/React.createElement("input", _extends({
    type: "checkbox",
    id: fieldId,
    checked: isControlled ? checked : undefined,
    defaultChecked: isControlled ? undefined : defaultChecked,
    onChange: toggle,
    disabled: disabled,
    style: {
      position: 'absolute',
      opacity: 0,
      width: W,
      height: H,
      margin: 0,
      cursor: 'inherit'
    }
  }, rest)), /*#__PURE__*/React.createElement("span", {
    style: {
      width: W,
      height: H,
      borderRadius: 'var(--radius-pill)',
      background: on ? 'var(--color-primary)' : 'var(--gray-300)',
      transition: 'background var(--dur-base) var(--ease-out)',
      display: 'inline-block',
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      top: 3,
      left: 3,
      width: K,
      height: K,
      borderRadius: '50%',
      background: 'var(--white)',
      boxShadow: 'var(--shadow-sm)',
      transform: on ? `translateX(${W - H}px)` : 'translateX(0)',
      transition: 'transform var(--dur-base) var(--ease-spring)'
    }
  }))), label && /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 2
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-sm)',
      fontWeight: 'var(--weight-medium)',
      color: 'var(--text-strong)',
      lineHeight: 1.4
    }
  }, label), description && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-xs)',
      color: 'var(--text-muted)',
      lineHeight: 1.4
    }
  }, description)));
}
Object.assign(__ds_scope, { Switch });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Switch.jsx", error: String((e && e.message) || e) }); }

// ui_kits/marketing/Hero.jsx
try { (() => {
// Marketing site sections for ABC SalesMaster.
const {
  Icon
} = window.ABCIcons;
const {
  Button,
  Badge
} = window.AIBizConnectDesignSystem_d948fa;
function Nav() {
  return /*#__PURE__*/React.createElement("header", {
    style: {
      position: 'sticky',
      top: 0,
      zIndex: 20,
      background: 'rgba(255,255,255,0.85)',
      backdropFilter: 'blur(10px)',
      borderBottom: '1px solid var(--border-subtle)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 1200,
      margin: '0 auto',
      height: 68,
      padding: '0 24px',
      display: 'flex',
      alignItems: 'center',
      gap: 28
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/logo-mark.png",
    alt: "ABC SalesMaster",
    style: {
      width: 30,
      height: 30
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 600,
      fontSize: 19,
      color: 'var(--navy-900)',
      letterSpacing: '-0.01em'
    }
  }, "ABC ", /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--gray-500)'
    }
  }, "SalesMaster"))), /*#__PURE__*/React.createElement("nav", {
    style: {
      display: 'flex',
      gap: 24,
      marginLeft: 16
    }
  }, ['Features', 'Solutions', 'Pricing', 'Customers'].map(l => /*#__PURE__*/React.createElement("a", {
    key: l,
    href: "#",
    style: {
      fontSize: 14.5,
      fontWeight: 600,
      color: 'var(--text-body)',
      textDecoration: 'none'
    }
  }, l))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginLeft: 'auto',
      display: 'flex',
      alignItems: 'center',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("a", {
    href: "#",
    style: {
      fontSize: 14.5,
      fontWeight: 600,
      color: 'var(--text-strong)'
    }
  }, "Log in"), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "md",
    rightIcon: /*#__PURE__*/React.createElement(Icon, {
      name: "arrow-right",
      size: 16
    })
  }, "Start free trial"))));
}
function Hero() {
  return /*#__PURE__*/React.createElement("section", {
    style: {
      position: 'relative',
      overflow: 'hidden',
      background: 'radial-gradient(1100px 500px at 50% -10%, var(--blue-50), transparent 70%)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 1100,
      margin: '0 auto',
      padding: '80px 24px 0',
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8,
      padding: '6px 14px',
      borderRadius: 'var(--radius-pill)',
      background: 'var(--white)',
      border: '1px solid var(--border-subtle)',
      boxShadow: 'var(--shadow-xs)',
      marginBottom: 24
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "sparkles",
    size: 15,
    color: "var(--color-primary)"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      fontWeight: 600,
      color: 'var(--text-body)'
    }
  }, "Now with AI-drafted follow-ups")), /*#__PURE__*/React.createElement("h1", {
    style: {
      fontSize: 60,
      lineHeight: 1.05,
      letterSpacing: '-0.03em',
      color: 'var(--navy-900)',
      maxWidth: 820,
      margin: '0 auto',
      fontWeight: 600
    }
  }, "Run your whole business from ", /*#__PURE__*/React.createElement("span", {
    style: {
      background: 'var(--gradient-brand)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent'
    }
  }, "one platform")), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 20,
      lineHeight: 1.55,
      color: 'var(--text-body)',
      maxWidth: 620,
      margin: '22px auto 0'
    }
  }, "CRM, marketing automation, a website builder, and analytics \u2014 built for solo professionals and small teams who'd rather sell than juggle software."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 14,
      justifyContent: 'center',
      marginTop: 32
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "lg",
    rightIcon: /*#__PURE__*/React.createElement(Icon, {
      name: "arrow-right",
      size: 18
    })
  }, "Start free \u2014 14 days"), /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    size: "lg",
    leftIcon: /*#__PURE__*/React.createElement(Icon, {
      name: "play",
      size: 16
    })
  }, "Watch demo")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13.5,
      color: 'var(--text-muted)',
      marginTop: 16
    }
  }, "No credit card required \xB7 Cancel anytime"), /*#__PURE__*/React.createElement(HeroPreview, null)));
}
function HeroPreview() {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 48,
      position: 'relative',
      borderRadius: 'var(--radius-2xl)',
      background: 'var(--white)',
      border: '1px solid var(--border-subtle)',
      boxShadow: 'var(--shadow-xl)',
      padding: 14,
      maxWidth: 920,
      marginLeft: 'auto',
      marginRight: 'auto'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
      border: '1px solid var(--border-subtle)',
      display: 'grid',
      gridTemplateColumns: '180px 1fr',
      minHeight: 320,
      textAlign: 'left'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--gray-50)',
      borderRight: '1px solid var(--border-subtle)',
      padding: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      marginBottom: 18
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/logo-mark.png",
    style: {
      width: 24,
      height: 24
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 700,
      fontSize: 13,
      color: 'var(--navy-900)'
    }
  }, "SalesMaster")), [['layout-dashboard', 'Dashboard', true], ['users', 'Contacts'], ['git-branch', 'Pipeline'], ['megaphone', 'Marketing'], ['bar-chart', 'Analytics']].map(([ic, l, on]) => /*#__PURE__*/React.createElement("div", {
    key: l,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 9,
      padding: '8px 10px',
      borderRadius: 8,
      marginBottom: 3,
      background: on ? 'var(--blue-50)' : 'transparent',
      color: on ? 'var(--color-primary)' : 'var(--text-muted)',
      fontSize: 13,
      fontWeight: 600
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: ic,
    size: 16
  }), " ", l))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 20,
      background: 'var(--surface-card)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3,1fr)',
      gap: 12,
      marginBottom: 16
    }
  }, [['Pipeline', '$48,920', '+12%'], ['New leads', '327', '+8%'], ['Win rate', '34%', '+3%']].map(([l, v, d]) => /*#__PURE__*/React.createElement("div", {
    key: l,
    style: {
      border: '1px solid var(--border-subtle)',
      borderRadius: 10,
      padding: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: 'var(--text-muted)',
      fontWeight: 600
    }
  }, l), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 600,
      fontSize: 24,
      color: 'var(--text-heading)',
      margin: '4px 0'
    }
  }, v), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      fontWeight: 700,
      color: 'var(--green-600)'
    }
  }, d)))), /*#__PURE__*/React.createElement("div", {
    style: {
      border: '1px solid var(--border-subtle)',
      borderRadius: 10,
      padding: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 14,
      marginBottom: 12,
      color: 'var(--text-heading)'
    }
  }, "Pipeline by stage"), [['New', 100, 'var(--blue-300)'], ['Qualified', 64, 'var(--blue-400)'], ['Proposal', 38, 'var(--blue-500)'], ['Won', 30, 'var(--green-500)']].map(([n, w, c]) => /*#__PURE__*/React.createElement("div", {
    key: n,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 70,
      fontSize: 12,
      color: 'var(--text-body)',
      fontWeight: 600
    }
  }, n), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      height: 18,
      background: 'var(--gray-100)',
      borderRadius: 5,
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      width: w + '%',
      height: '100%',
      background: c
    }
  }))))))));
}
window.ABCNav = Nav;
window.ABCHero = Hero;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/marketing/Hero.jsx", error: String((e && e.message) || e) }); }

// ui_kits/marketing/Sections.jsx
try { (() => {
// Marketing site — features, industries, pricing, CTA, footer.
const {
  Icon: MIcon
} = window.ABCIcons;
const {
  Button: MButton,
  Badge: MBadge
} = window.AIBizConnectDesignSystem_d948fa;
const FEATURES = [{
  icon: 'users',
  title: 'CRM & contacts',
  body: 'Every lead, client, and conversation in one organized place — with reminders so nothing slips.'
}, {
  icon: 'megaphone',
  title: 'Marketing automation',
  body: 'Email & SMS sequences that nurture leads on autopilot and book more meetings for you.'
}, {
  icon: 'globe',
  title: 'Website & booking',
  body: 'Launch a branded site and self-scheduling pages in minutes. No developer required.'
}, {
  icon: 'bar-chart',
  title: 'Analytics',
  body: 'See pipeline velocity, campaign ROI, and revenue trends at a glance — not in a spreadsheet.'
}];
const INDUSTRIES = ['Law firms', 'Insurance agencies', 'Investment advisors', 'Real estate'];
const PLANS = [{
  name: 'Starter',
  price: '$29',
  tag: 'Solo professionals',
  features: ['1 user', 'CRM + 500 contacts', 'Email campaigns', 'Booking page'],
  cta: 'Start free',
  highlight: false
}, {
  name: 'Professional',
  price: '$79',
  tag: 'Growing practices',
  features: ['Up to 5 users', 'Unlimited contacts', 'Email + SMS automation', 'Website builder', 'Analytics dashboard'],
  cta: 'Start free trial',
  highlight: true
}, {
  name: 'Business',
  price: '$149',
  tag: 'Established teams',
  features: ['Unlimited users', 'Advanced automations', 'Custom reporting', 'Priority support', 'API access'],
  cta: 'Contact sales',
  highlight: false
}];
function Section({
  children,
  style
}) {
  return /*#__PURE__*/React.createElement("section", {
    style: {
      maxWidth: 1200,
      margin: '0 auto',
      padding: '88px 24px',
      ...style
    }
  }, children);
}
function SectionHead({
  eyebrow,
  title,
  sub
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center',
      maxWidth: 640,
      margin: '0 auto 48px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      fontWeight: 700,
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      color: 'var(--color-primary)',
      marginBottom: 12
    }
  }, eyebrow), /*#__PURE__*/React.createElement("h2", {
    style: {
      fontSize: 40,
      letterSpacing: '-0.025em',
      color: 'var(--navy-900)',
      fontWeight: 600,
      lineHeight: 1.1
    }
  }, title), sub && /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 18,
      color: 'var(--text-body)',
      marginTop: 16,
      lineHeight: 1.55
    }
  }, sub));
}
function Trustbar() {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      borderTop: '1px solid var(--border-subtle)',
      borderBottom: '1px solid var(--border-subtle)',
      background: 'var(--white)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 1100,
      margin: '0 auto',
      padding: '26px 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 40,
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13.5,
      color: 'var(--text-muted)',
      fontWeight: 600
    }
  }, "Trusted by 4,000+ small businesses"), INDUSTRIES.map(i => /*#__PURE__*/React.createElement("span", {
    key: i,
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 600,
      fontSize: 17,
      color: 'var(--gray-400)'
    }
  }, i))));
}
function Features() {
  return /*#__PURE__*/React.createElement(Section, null, /*#__PURE__*/React.createElement(SectionHead, {
    eyebrow: "One platform",
    title: "Everything you need to grow",
    sub: "Stop stitching together five tools. ABC SalesMaster replaces your CRM, email marketing, website, and reporting."
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(2,1fr)',
      gap: 20
    }
  }, FEATURES.map(f => /*#__PURE__*/React.createElement("div", {
    key: f.title,
    style: {
      display: 'flex',
      gap: 16,
      padding: 26,
      background: 'var(--white)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-xl)',
      boxShadow: 'var(--shadow-sm)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 48,
      height: 48,
      flex: 'none',
      borderRadius: 'var(--radius-lg)',
      background: 'var(--gradient-brand)',
      color: 'var(--white)',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: 'var(--shadow-brand)'
    }
  }, /*#__PURE__*/React.createElement(MIcon, {
    name: f.icon,
    size: 22
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 600,
      fontSize: 19,
      color: 'var(--text-heading)',
      marginBottom: 6
    }
  }, f.title), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14.5,
      lineHeight: 1.55,
      color: 'var(--text-body)'
    }
  }, f.body))))));
}
function Industries() {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--gray-50)',
      borderTop: '1px solid var(--border-subtle)',
      borderBottom: '1px solid var(--border-subtle)'
    }
  }, /*#__PURE__*/React.createElement(Section, {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 56,
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      fontWeight: 700,
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      color: 'var(--color-primary)',
      marginBottom: 12
    }
  }, "Built for your work"), /*#__PURE__*/React.createElement("h2", {
    style: {
      fontSize: 38,
      letterSpacing: '-0.025em',
      color: 'var(--navy-900)',
      fontWeight: 600,
      lineHeight: 1.12
    }
  }, "Tailored to how professionals actually sell"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 17,
      color: 'var(--text-body)',
      marginTop: 16,
      lineHeight: 1.6
    }
  }, "From intake to closed deal, ABC SalesMaster fits the way your practice runs \u2014 with templates and automations made for client-based businesses."), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 24
    }
  }, /*#__PURE__*/React.createElement(MButton, {
    variant: "primary",
    size: "lg",
    rightIcon: /*#__PURE__*/React.createElement(MIcon, {
      name: "arrow-right",
      size: 18
    })
  }, "See your industry"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 14
    }
  }, [['building', 'Law firms', 'Matter intake & retainers'], ['file-text', 'Insurance', 'Policy renewals on time'], ['trending-up', 'Advisors', 'Nurture every prospect'], ['home', 'Real estate', 'Listings to closings']].map(([ic, t, s]) => /*#__PURE__*/React.createElement("div", {
    key: t,
    style: {
      padding: 22,
      background: 'var(--white)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-xl)',
      boxShadow: 'var(--shadow-xs)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 40,
      height: 40,
      borderRadius: 'var(--radius-md)',
      background: 'var(--blue-50)',
      color: 'var(--color-primary)',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement(MIcon, {
    name: ic,
    size: 20
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 600,
      fontSize: 16,
      color: 'var(--text-heading)'
    }
  }, t), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: 'var(--text-muted)',
      marginTop: 3
    }
  }, s))))));
}
function Pricing() {
  return /*#__PURE__*/React.createElement(Section, null, /*#__PURE__*/React.createElement(SectionHead, {
    eyebrow: "Pricing",
    title: "Simple plans that scale with you",
    sub: "Start free for 14 days. No credit card, no setup fees."
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3,1fr)',
      gap: 20,
      alignItems: 'stretch'
    }
  }, PLANS.map(p => /*#__PURE__*/React.createElement("div", {
    key: p.name,
    style: {
      position: 'relative',
      padding: 28,
      borderRadius: 'var(--radius-2xl)',
      background: p.highlight ? 'var(--navy-900)' : 'var(--white)',
      border: p.highlight ? 'none' : '1px solid var(--border-subtle)',
      boxShadow: p.highlight ? 'var(--shadow-xl)' : 'var(--shadow-sm)',
      color: p.highlight ? 'var(--white)' : 'inherit',
      transform: p.highlight ? 'translateY(-8px)' : 'none'
    }
  }, p.highlight && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 20,
      right: 20
    }
  }, /*#__PURE__*/React.createElement(MBadge, {
    tone: "brand",
    solid: true
  }, "Most popular")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 600,
      fontSize: 18,
      color: p.highlight ? 'var(--white)' : 'var(--text-heading)'
    }
  }, p.name), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: p.highlight ? 'var(--blue-200)' : 'var(--text-muted)',
      marginTop: 2
    }
  }, p.tag), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'baseline',
      gap: 4,
      margin: '18px 0'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 600,
      fontSize: 44,
      letterSpacing: '-0.02em',
      color: p.highlight ? 'var(--white)' : 'var(--navy-900)'
    }
  }, p.price), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 15,
      color: p.highlight ? 'rgba(255,255,255,0.6)' : 'var(--text-muted)'
    }
  }, "/mo")), /*#__PURE__*/React.createElement(MButton, {
    variant: p.highlight ? 'primary' : 'secondary',
    fullWidth: true,
    size: "md"
  }, p.cta), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 11,
      marginTop: 22
    }
  }, p.features.map(f => /*#__PURE__*/React.createElement("div", {
    key: f,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      fontSize: 14,
      color: p.highlight ? 'rgba(255,255,255,0.85)' : 'var(--text-body)'
    }
  }, /*#__PURE__*/React.createElement(MIcon, {
    name: "check",
    size: 16,
    color: p.highlight ? 'var(--blue-300)' : 'var(--color-primary)',
    strokeWidth: 2.6
  }), " ", f)))))));
}
function CTA() {
  return /*#__PURE__*/React.createElement(Section, {
    style: {
      paddingTop: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      borderRadius: 'var(--radius-2xl)',
      background: 'var(--gradient-brand)',
      padding: '60px 40px',
      textAlign: 'center',
      position: 'relative',
      overflow: 'hidden',
      boxShadow: 'var(--shadow-brand)'
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      fontSize: 38,
      color: 'var(--white)',
      fontWeight: 600,
      letterSpacing: '-0.025em',
      lineHeight: 1.1
    }
  }, "Spend less time on software,", /*#__PURE__*/React.createElement("br", null), "more time closing."), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 18,
      color: 'rgba(255,255,255,0.85)',
      marginTop: 14
    }
  }, "Join 4,000+ professionals running their business on ABC SalesMaster."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 14,
      justifyContent: 'center',
      marginTop: 28
    }
  }, /*#__PURE__*/React.createElement(MButton, {
    variant: "secondary",
    size: "lg",
    rightIcon: /*#__PURE__*/React.createElement(MIcon, {
      name: "arrow-right",
      size: 18
    })
  }, "Start your free trial"))));
}
function Footer() {
  const cols = [['Product', ['Features', 'Pricing', 'Integrations', 'Changelog']], ['Solutions', ['Law firms', 'Insurance', 'Advisors', 'Real estate']], ['Company', ['About', 'Customers', 'Careers', 'Contact']], ['Resources', ['Blog', 'Help center', 'API docs', 'Status']]];
  return /*#__PURE__*/React.createElement("footer", {
    style: {
      background: 'var(--navy-900)',
      color: 'rgba(255,255,255,0.7)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 1200,
      margin: '0 auto',
      padding: '56px 24px 32px',
      display: 'grid',
      gridTemplateColumns: '1.6fr repeat(4,1fr)',
      gap: 32
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/logo-mark.png",
    alt: "ABC SalesMaster",
    style: {
      width: 28,
      height: 28
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 600,
      fontSize: 18,
      color: 'var(--white)'
    }
  }, "ABC ", /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--gray-400)'
    }
  }, "SalesMaster"))), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 13.5,
      lineHeight: 1.6,
      maxWidth: 220
    }
  }, "The all-in-one platform for professionals who'd rather sell than juggle software.")), cols.map(([h, links]) => /*#__PURE__*/React.createElement("div", {
    key: h
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      fontWeight: 700,
      color: 'var(--white)',
      marginBottom: 14,
      letterSpacing: '0.02em'
    }
  }, h), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 10
    }
  }, links.map(l => /*#__PURE__*/React.createElement("a", {
    key: l,
    href: "#",
    style: {
      fontSize: 13.5,
      color: 'rgba(255,255,255,0.7)',
      textDecoration: 'none'
    }
  }, l)))))), /*#__PURE__*/React.createElement("div", {
    style: {
      borderTop: '1px solid rgba(255,255,255,0.12)',
      padding: '20px 24px',
      maxWidth: 1200,
      margin: '0 auto',
      display: 'flex',
      justifyContent: 'space-between',
      fontSize: 13
    }
  }, /*#__PURE__*/React.createElement("span", null, "\xA9 2026 AIBizConnect, Inc."), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      gap: 20
    }
  }, /*#__PURE__*/React.createElement("a", {
    href: "#",
    style: {
      color: 'inherit'
    }
  }, "Privacy"), /*#__PURE__*/React.createElement("a", {
    href: "#",
    style: {
      color: 'inherit'
    }
  }, "Terms"))));
}
window.ABCMarketing = function Marketing() {
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(window.ABCNav, null), /*#__PURE__*/React.createElement(window.ABCHero, null), /*#__PURE__*/React.createElement(Trustbar, null), /*#__PURE__*/React.createElement(Features, null), /*#__PURE__*/React.createElement(Industries, null), /*#__PURE__*/React.createElement(Pricing, null), /*#__PURE__*/React.createElement(CTA, null), /*#__PURE__*/React.createElement(Footer, null));
};
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/marketing/Sections.jsx", error: String((e && e.message) || e) }); }

// ui_kits/marketing/icons.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
// AIBizConnect icon set — Lucide line icons (MIT), 24×24, 2px stroke, round caps.
// A curated subset is embedded for offline reliability; swap in the full Lucide
// CDN (unpkg.com/lucide) to access the complete library with the same look.
const ICONS = {
  'layout-dashboard': '<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>',
  'users': '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  'git-branch': '<line x1="6" y1="3" x2="6" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/>',
  'megaphone': '<path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>',
  'globe': '<circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/><line x1="2" y1="12" x2="22" y2="12"/>',
  'bar-chart': '<path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/>',
  'settings': '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
  'search': '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  'bell': '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
  'plus': '<path d="M5 12h14"/><path d="M12 5v14"/>',
  'chevron-down': '<path d="m6 9 6 6 6-6"/>',
  'chevron-right': '<path d="m9 18 6-6-6-6"/>',
  'calendar': '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/>',
  'mail': '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
  'phone': '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>',
  'dollar-sign': '<line x1="12" y1="2" x2="12" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
  'more-horizontal': '<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>',
  'filter': '<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>',
  'check': '<path d="M20 6 9 17l-5-5"/>',
  'arrow-up-right': '<path d="M7 7h10v10"/><path d="M7 17 17 7"/>',
  'zap': '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
  'credit-card': '<rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>',
  'log-out': '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>',
  'star': '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
  'play': '<polygon points="6 3 20 12 6 21 6 3"/>',
  'inbox': '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
  'sparkles': '<path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3z"/>',
  'trending-up': '<polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>',
  'clock': '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  'file-text': '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z"/><path d="M14 2v5h5"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/>',
  'building': '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01M16 6h.01M12 6h.01M12 10h.01M12 14h.01M16 10h.01M16 14h.01M8 10h.01M8 14h.01"/>',
  'home': '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
  'menu': '<line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/>',
  'x': '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  'arrow-right': '<line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>'
};
function Icon({
  name,
  size = 20,
  strokeWidth = 2,
  color = 'currentColor',
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("svg", _extends({
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: color,
    strokeWidth: strokeWidth,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    style: {
      flex: 'none',
      ...style
    },
    dangerouslySetInnerHTML: {
      __html: ICONS[name] || ''
    }
  }, rest));
}
window.ABCIcons = {
  Icon,
  ICON_NAMES: Object.keys(ICONS)
};
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/marketing/icons.jsx", error: String((e && e.message) || e) }); }

// ui_kits/mobile/Mobile.jsx
try { (() => {
// ABC SalesMaster mobile app — screens + bottom tab navigation.
const {
  Icon
} = window.ABCIcons;
const {
  Badge,
  Avatar
} = window.AIBizConnectDesignSystem_d948fa;
const money = n => '$' + n.toLocaleString();
function StatTile({
  label,
  value,
  delta,
  up = true
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      background: 'var(--surface-card)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-lg)',
      padding: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: 'var(--text-muted)',
      fontWeight: 600
    }
  }, label), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 600,
      fontSize: 22,
      color: 'var(--text-heading)',
      margin: '4px 0 2px'
    }
  }, value), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      fontWeight: 700,
      color: up ? 'var(--green-600)' : 'var(--red-600)'
    }
  }, delta));
}
function HomeScreen() {
  const leads = [{
    name: 'Marcus Lee',
    org: 'Lee & Co. Realty',
    stage: 'qualified',
    tone: 'brand'
  }, {
    name: 'Acme Insurance',
    org: 'Acme Group',
    stage: 'proposal',
    tone: 'warning'
  }, {
    name: 'J. Whitfield',
    org: 'Whitfield Law',
    stage: 'new',
    tone: 'neutral'
  }];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '8px 16px 20px',
      display: 'flex',
      flexDirection: 'column',
      gap: 18
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: 'var(--text-muted)'
    }
  }, "Good morning"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 600,
      fontSize: 24,
      color: 'var(--text-heading)',
      letterSpacing: '-0.02em'
    }
  }, "Dana Ruiz")), /*#__PURE__*/React.createElement(Avatar, {
    name: "Dana Ruiz",
    size: "lg",
    status: "online"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement(StatTile, {
    label: "Pipeline",
    value: "$48.9k",
    delta: "+12%"
  }), /*#__PURE__*/React.createElement(StatTile, {
    label: "New leads",
    value: "327",
    delta: "+8%"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(SectionTitle, {
    title: "Today's tasks",
    action: "3 due"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 8
    }
  }, [['Call J. Whitfield', '2:00 PM'], ['Send Acme proposal', '4:30 PM'], ['Follow up · 3 leads', '5:00 PM']].map(([t, w], i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      background: 'var(--surface-card)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-md)',
      padding: '12px 14px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 20,
      height: 20,
      borderRadius: 'var(--radius-xs)',
      border: '1.5px solid var(--border-strong)',
      flex: 'none'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      fontSize: 14.5,
      fontWeight: 500,
      color: 'var(--text-strong)'
    }
  }, t), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12.5,
      color: 'var(--text-muted)'
    }
  }, w))))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(SectionTitle, {
    title: "Recent leads",
    action: "View all"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 8
    }
  }, leads.map(l => /*#__PURE__*/React.createElement("div", {
    key: l.name,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      background: 'var(--surface-card)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-md)',
      padding: '12px 14px'
    }
  }, /*#__PURE__*/React.createElement(Avatar, {
    name: l.name,
    size: "md"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14.5,
      fontWeight: 600,
      color: 'var(--text-strong)'
    }
  }, l.name), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12.5,
      color: 'var(--text-muted)'
    }
  }, l.org)), /*#__PURE__*/React.createElement(Badge, {
    tone: l.tone,
    dot: true
  }, l.stage))))));
}
function ContactsScreen() {
  const items = [{
    name: 'Octavia Brooks',
    org: 'Brooks Financial',
    value: '$31k',
    tone: 'warning',
    stage: 'negotiation'
  }, {
    name: 'Acme Insurance',
    org: 'Acme Group',
    value: '$22k',
    tone: 'warning',
    stage: 'proposal'
  }, {
    name: 'Priya Nair',
    org: 'Nair Advisory',
    value: '$14k',
    tone: 'success',
    stage: 'won'
  }, {
    name: 'Sunrise Dental',
    org: 'Sunrise Dental PC',
    value: '$9.8k',
    tone: 'brand',
    stage: 'qualified'
  }, {
    name: 'Marcus Lee',
    org: 'Lee & Co. Realty',
    value: '$8.4k',
    tone: 'brand',
    stage: 'qualified'
  }, {
    name: 'J. Whitfield',
    org: 'Whitfield Law',
    value: '$5k',
    tone: 'neutral',
    stage: 'new'
  }];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '4px 16px 20px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      height: 42,
      padding: '0 12px',
      background: 'var(--gray-100)',
      borderRadius: 'var(--radius-md)',
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "search",
    size: 17,
    color: "var(--text-muted)"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 14.5,
      color: 'var(--text-muted)'
    }
  }, "Search contacts")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 8
    }
  }, items.map(c => /*#__PURE__*/React.createElement("div", {
    key: c.name,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      background: 'var(--surface-card)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-md)',
      padding: '12px 14px'
    }
  }, /*#__PURE__*/React.createElement(Avatar, {
    name: c.name,
    size: "md"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14.5,
      fontWeight: 600,
      color: 'var(--text-strong)'
    }
  }, c.name), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12.5,
      color: 'var(--text-muted)'
    }
  }, c.org)), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'right'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 13.5,
      fontWeight: 600,
      color: 'var(--text-strong)'
    }
  }, c.value), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 3
    }
  }, /*#__PURE__*/React.createElement(Badge, {
    tone: c.tone
  }, c.stage)))))));
}
function PipelineScreen() {
  const cols = [{
    name: 'New',
    count: 86,
    color: 'var(--blue-300)'
  }, {
    name: 'Qualified',
    count: 41,
    color: 'var(--blue-400)'
  }, {
    name: 'Proposal',
    count: 18,
    color: 'var(--blue-500)'
  }, {
    name: 'Negotiation',
    count: 9,
    color: 'var(--blue-600)'
  }, {
    name: 'Won',
    count: 14,
    color: 'var(--green-500)'
  }];
  const max = 86;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '8px 16px 20px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--navy-900)',
      borderRadius: 'var(--radius-lg)',
      padding: 18,
      color: 'var(--white)',
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: 'var(--blue-200)'
    }
  }, "Weighted pipeline"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 600,
      fontSize: 30,
      marginTop: 4
    }
  }, "$294,000"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: 'rgba(255,255,255,0.7)',
      marginTop: 2
    }
  }, "8 active deals \xB7 +12% MoM")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 12
    }
  }, cols.map(c => /*#__PURE__*/React.createElement("div", {
    key: c.name
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      marginBottom: 6
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13.5,
      fontWeight: 600,
      color: 'var(--text-strong)'
    }
  }, c.name), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      color: 'var(--text-muted)'
    }
  }, c.count)), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 10,
      background: 'var(--gray-100)',
      borderRadius: 5,
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: c.count / max * 100 + '%',
      height: '100%',
      background: c.color,
      borderRadius: 5
    }
  }))))));
}
function SectionTitle({
  title,
  action
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 600,
      fontSize: 16,
      color: 'var(--text-heading)'
    }
  }, title), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      fontWeight: 600,
      color: 'var(--color-primary)'
    }
  }, action));
}
const TABS = [{
  id: 'home',
  label: 'Home',
  icon: 'home'
}, {
  id: 'contacts',
  label: 'Contacts',
  icon: 'users'
}, {
  id: 'pipeline',
  label: 'Pipeline',
  icon: 'git-branch'
}, {
  id: 'more',
  label: 'More',
  icon: 'menu'
}];
function MobileApp() {
  const [tab, setTab] = React.useState('home');
  const HEADER = {
    home: 'ABC SalesMaster',
    contacts: 'Contacts',
    pipeline: 'Pipeline',
    more: 'More'
  };
  let screen;
  if (tab === 'home') screen = /*#__PURE__*/React.createElement(HomeScreen, null);else if (tab === 'contacts') screen = /*#__PURE__*/React.createElement(ContactsScreen, null);else if (tab === 'pipeline') screen = /*#__PURE__*/React.createElement(PipelineScreen, null);else screen = /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 40,
      textAlign: 'center',
      color: 'var(--text-muted)',
      fontSize: 14
    }
  }, "Settings, billing & integrations");
  return /*#__PURE__*/React.createElement("div", {
    style: {
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--surface-page)',
      fontFamily: 'var(--font-sans)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '52px 16px 12px'
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/logo-mark.png",
    style: {
      width: 26,
      height: 26
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 600,
      fontSize: 17,
      color: 'var(--navy-900)'
    }
  }, HEADER[tab]), /*#__PURE__*/React.createElement("button", {
    style: {
      marginLeft: 'auto',
      width: 36,
      height: 36,
      borderRadius: 'var(--radius-md)',
      border: '1px solid var(--border-subtle)',
      background: 'var(--surface-card)',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'var(--text-body)',
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "bell",
    size: 18
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      top: 7,
      right: 8,
      width: 7,
      height: 7,
      borderRadius: '50%',
      background: 'var(--danger)',
      border: '2px solid var(--surface-card)'
    }
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflow: 'auto',
      position: 'relative'
    }
  }, screen), /*#__PURE__*/React.createElement("button", {
    style: {
      position: 'absolute',
      right: 20,
      bottom: 96,
      width: 56,
      height: 56,
      borderRadius: '50%',
      border: 'none',
      background: 'var(--gradient-brand)',
      color: 'var(--white)',
      boxShadow: 'var(--shadow-brand)',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      zIndex: 30
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 26,
    strokeWidth: 2.4
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      borderTop: '1px solid var(--border-subtle)',
      background: 'var(--surface-card)',
      paddingBottom: 8
    }
  }, TABS.map(t => {
    const on = tab === t.id;
    return /*#__PURE__*/React.createElement("button", {
      key: t.id,
      onClick: () => setTab(t.id),
      style: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
        padding: '10px 0',
        border: 'none',
        background: 'transparent',
        cursor: 'pointer',
        color: on ? 'var(--color-primary)' : 'var(--text-muted)'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: t.icon,
      size: 22,
      strokeWidth: on ? 2.3 : 2
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 11,
        fontWeight: 600
      }
    }, t.label));
  })));
}
window.ABCMobileApp = MobileApp;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/mobile/Mobile.jsx", error: String((e && e.message) || e) }); }

// ui_kits/mobile/icons.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
// AIBizConnect icon set — Lucide line icons (MIT), 24×24, 2px stroke, round caps.
// A curated subset is embedded for offline reliability; swap in the full Lucide
// CDN (unpkg.com/lucide) to access the complete library with the same look.
const ICONS = {
  'layout-dashboard': '<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>',
  'users': '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  'git-branch': '<line x1="6" y1="3" x2="6" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/>',
  'megaphone': '<path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>',
  'globe': '<circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/><line x1="2" y1="12" x2="22" y2="12"/>',
  'bar-chart': '<path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/>',
  'settings': '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
  'search': '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  'bell': '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
  'plus': '<path d="M5 12h14"/><path d="M12 5v14"/>',
  'chevron-down': '<path d="m6 9 6 6 6-6"/>',
  'chevron-right': '<path d="m9 18 6-6-6-6"/>',
  'calendar': '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/>',
  'mail': '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
  'phone': '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>',
  'dollar-sign': '<line x1="12" y1="2" x2="12" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
  'more-horizontal': '<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>',
  'filter': '<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>',
  'check': '<path d="M20 6 9 17l-5-5"/>',
  'arrow-up-right': '<path d="M7 7h10v10"/><path d="M7 17 17 7"/>',
  'zap': '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
  'credit-card': '<rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>',
  'log-out': '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>',
  'star': '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
  'play': '<polygon points="6 3 20 12 6 21 6 3"/>',
  'inbox': '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
  'sparkles': '<path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3z"/>',
  'trending-up': '<polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>',
  'clock': '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  'file-text': '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z"/><path d="M14 2v5h5"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/>',
  'building': '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01M16 6h.01M12 6h.01M12 10h.01M12 14h.01M16 10h.01M16 14h.01M8 10h.01M8 14h.01"/>',
  'home': '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
  'menu': '<line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/>',
  'x': '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  'arrow-right': '<line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>'
};
function Icon({
  name,
  size = 20,
  strokeWidth = 2,
  color = 'currentColor',
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("svg", _extends({
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: color,
    strokeWidth: strokeWidth,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    style: {
      flex: 'none',
      ...style
    },
    dangerouslySetInnerHTML: {
      __html: ICONS[name] || ''
    }
  }, rest));
}
window.ABCIcons = {
  Icon,
  ICON_NAMES: Object.keys(ICONS)
};
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/mobile/icons.jsx", error: String((e && e.message) || e) }); }

// ui_kits/mobile/ios-frame.jsx
try { (() => {
// @ds-adherence-ignore -- omelette starter scaffold (raw elements/hex/px by design)

/* BEGIN USAGE */
// iOS.jsx — Simplified iOS 26 (Liquid Glass) device frame
// Based on the iOS 26 UI Kit + Figma status bar spec. No assets, no deps.
// Exports (to window): IOSDevice, IOSStatusBar, IOSNavBar, IOSGlassPill, IOSList, IOSListRow, IOSKeyboard
//
// Usage — wrap your screen content in <IOSDevice> to get the bezel, status bar
// and home indicator (props: title, dark, keyboard):
//
//   <IOSDevice title="Settings">
//     ...your screen content...
//   </IOSDevice>
//   <IOSDevice dark title="Search" keyboard>…</IOSDevice>
/* END USAGE */

// ─────────────────────────────────────────────────────────────
// Status bar
// ─────────────────────────────────────────────────────────────
function IOSStatusBar({
  dark = false,
  time = '9:41'
}) {
  const c = dark ? '#fff' : '#000';
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 154,
      alignItems: 'center',
      justifyContent: 'center',
      padding: '21px 24px 19px',
      boxSizing: 'border-box',
      position: 'relative',
      zIndex: 20,
      width: '100%'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      height: 22,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: 1.5
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: '-apple-system, "SF Pro", system-ui',
      fontWeight: 590,
      fontSize: 17,
      lineHeight: '22px',
      color: c
    }
  }, time)), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      height: 22,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
      paddingTop: 1,
      paddingRight: 1
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "19",
    height: "12",
    viewBox: "0 0 19 12"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "0",
    y: "7.5",
    width: "3.2",
    height: "4.5",
    rx: "0.7",
    fill: c
  }), /*#__PURE__*/React.createElement("rect", {
    x: "4.8",
    y: "5",
    width: "3.2",
    height: "7",
    rx: "0.7",
    fill: c
  }), /*#__PURE__*/React.createElement("rect", {
    x: "9.6",
    y: "2.5",
    width: "3.2",
    height: "9.5",
    rx: "0.7",
    fill: c
  }), /*#__PURE__*/React.createElement("rect", {
    x: "14.4",
    y: "0",
    width: "3.2",
    height: "12",
    rx: "0.7",
    fill: c
  })), /*#__PURE__*/React.createElement("svg", {
    width: "17",
    height: "12",
    viewBox: "0 0 17 12"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M8.5 3.2C10.8 3.2 12.9 4.1 14.4 5.6L15.5 4.5C13.7 2.7 11.2 1.5 8.5 1.5C5.8 1.5 3.3 2.7 1.5 4.5L2.6 5.6C4.1 4.1 6.2 3.2 8.5 3.2Z",
    fill: c
  }), /*#__PURE__*/React.createElement("path", {
    d: "M8.5 6.8C9.9 6.8 11.1 7.3 12 8.2L13.1 7.1C11.8 5.9 10.2 5.1 8.5 5.1C6.8 5.1 5.2 5.9 3.9 7.1L5 8.2C5.9 7.3 7.1 6.8 8.5 6.8Z",
    fill: c
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "8.5",
    cy: "10.5",
    r: "1.5",
    fill: c
  })), /*#__PURE__*/React.createElement("svg", {
    width: "27",
    height: "13",
    viewBox: "0 0 27 13"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "0.5",
    y: "0.5",
    width: "23",
    height: "12",
    rx: "3.5",
    stroke: c,
    strokeOpacity: "0.35",
    fill: "none"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "2",
    y: "2",
    width: "20",
    height: "9",
    rx: "2",
    fill: c
  }), /*#__PURE__*/React.createElement("path", {
    d: "M25 4.5V8.5C25.8 8.2 26.5 7.2 26.5 6.5C26.5 5.8 25.8 4.8 25 4.5Z",
    fill: c,
    fillOpacity: "0.4"
  }))));
}

// ─────────────────────────────────────────────────────────────
// Liquid glass pill — blur + tint + shine
// ─────────────────────────────────────────────────────────────
function IOSGlassPill({
  children,
  dark = false,
  style = {}
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      height: 44,
      minWidth: 44,
      borderRadius: 9999,
      position: 'relative',
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: dark ? '0 2px 6px rgba(0,0,0,0.35), 0 6px 16px rgba(0,0,0,0.2)' : '0 1px 3px rgba(0,0,0,0.07), 0 3px 10px rgba(0,0,0,0.06)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      borderRadius: 9999,
      backdropFilter: 'blur(12px) saturate(180%)',
      WebkitBackdropFilter: 'blur(12px) saturate(180%)',
      background: dark ? 'rgba(120,120,128,0.28)' : 'rgba(255,255,255,0.5)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      borderRadius: 9999,
      boxShadow: dark ? 'inset 1.5px 1.5px 1px rgba(255,255,255,0.15), inset -1px -1px 1px rgba(255,255,255,0.08)' : 'inset 1.5px 1.5px 1px rgba(255,255,255,0.7), inset -1px -1px 1px rgba(255,255,255,0.4)',
      border: dark ? '0.5px solid rgba(255,255,255,0.15)' : '0.5px solid rgba(0,0,0,0.06)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      zIndex: 1,
      display: 'flex',
      alignItems: 'center',
      padding: '0 4px'
    }
  }, children));
}

// ─────────────────────────────────────────────────────────────
// Navigation bar — glass pills + large title
// ─────────────────────────────────────────────────────────────
function IOSNavBar({
  title = 'Title',
  dark = false,
  trailingIcon = true
}) {
  const muted = dark ? 'rgba(255,255,255,0.6)' : '#404040';
  const text = dark ? '#fff' : '#000';
  const pillIcon = content => /*#__PURE__*/React.createElement(IOSGlassPill, {
    dark: dark
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 36,
      height: 36,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, content));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      paddingTop: 62,
      paddingBottom: 10,
      position: 'relative',
      zIndex: 5
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 16px'
    }
  }, pillIcon(/*#__PURE__*/React.createElement("svg", {
    width: "12",
    height: "20",
    viewBox: "0 0 12 20",
    fill: "none",
    style: {
      marginLeft: -1
    }
  }, /*#__PURE__*/React.createElement("path", {
    d: "M10 2L2 10l8 8",
    stroke: muted,
    strokeWidth: "2.5",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }))), trailingIcon && pillIcon(/*#__PURE__*/React.createElement("svg", {
    width: "22",
    height: "6",
    viewBox: "0 0 22 6"
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "3",
    cy: "3",
    r: "2.5",
    fill: muted
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "11",
    cy: "3",
    r: "2.5",
    fill: muted
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "19",
    cy: "3",
    r: "2.5",
    fill: muted
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '0 16px',
      fontFamily: '-apple-system, system-ui',
      fontSize: 34,
      fontWeight: 700,
      lineHeight: '41px',
      color: text,
      letterSpacing: 0.4
    }
  }, title));
}

// ─────────────────────────────────────────────────────────────
// Grouped list (inset card, r:26) + row (52px)
// ─────────────────────────────────────────────────────────────
function IOSListRow({
  title,
  detail,
  icon,
  chevron = true,
  isLast = false,
  dark = false
}) {
  const text = dark ? '#fff' : '#000';
  const sec = dark ? 'rgba(235,235,245,0.6)' : 'rgba(60,60,67,0.6)';
  const ter = dark ? 'rgba(235,235,245,0.3)' : 'rgba(60,60,67,0.3)';
  const sep = dark ? 'rgba(84,84,88,0.65)' : 'rgba(60,60,67,0.12)';
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      minHeight: 52,
      padding: '0 16px',
      position: 'relative',
      fontFamily: '-apple-system, system-ui',
      fontSize: 17,
      letterSpacing: -0.43
    }
  }, icon && /*#__PURE__*/React.createElement("div", {
    style: {
      width: 30,
      height: 30,
      borderRadius: 7,
      background: icon,
      marginRight: 12,
      flexShrink: 0
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      color: text
    }
  }, title), detail && /*#__PURE__*/React.createElement("span", {
    style: {
      color: sec,
      marginRight: 6
    }
  }, detail), chevron && /*#__PURE__*/React.createElement("svg", {
    width: "8",
    height: "14",
    viewBox: "0 0 8 14",
    style: {
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("path", {
    d: "M1 1l6 6-6 6",
    stroke: ter,
    strokeWidth: "2",
    fill: "none",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  })), !isLast && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      left: icon ? 58 : 16,
      height: 0.5,
      background: sep
    }
  }));
}
function IOSList({
  header,
  children,
  dark = false
}) {
  const hc = dark ? 'rgba(235,235,245,0.6)' : 'rgba(60,60,67,0.6)';
  const bg = dark ? '#1C1C1E' : '#fff';
  return /*#__PURE__*/React.createElement("div", null, header && /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: '-apple-system, system-ui',
      fontSize: 13,
      color: hc,
      textTransform: 'uppercase',
      padding: '8px 36px 6px',
      letterSpacing: -0.08
    }
  }, header), /*#__PURE__*/React.createElement("div", {
    style: {
      background: bg,
      borderRadius: 26,
      margin: '0 16px',
      overflow: 'hidden'
    }
  }, children));
}

// ─────────────────────────────────────────────────────────────
// Device frame
// ─────────────────────────────────────────────────────────────
function IOSDevice({
  children,
  width = 402,
  height = 874,
  dark = false,
  title,
  keyboard = false
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      width,
      height,
      borderRadius: 48,
      overflow: 'hidden',
      position: 'relative',
      background: dark ? '#000' : '#F2F2F7',
      boxShadow: '0 40px 80px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.12)',
      fontFamily: '-apple-system, system-ui, sans-serif',
      WebkitFontSmoothing: 'antialiased'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 11,
      left: '50%',
      transform: 'translateX(-50%)',
      width: 126,
      height: 37,
      borderRadius: 24,
      background: '#000',
      zIndex: 50
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 10
    }
  }, /*#__PURE__*/React.createElement(IOSStatusBar, {
    dark: dark
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      height: '100%',
      display: 'flex',
      flexDirection: 'column'
    }
  }, title !== undefined && /*#__PURE__*/React.createElement(IOSNavBar, {
    title: title,
    dark: dark
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflow: 'auto'
    }
  }, children), keyboard && /*#__PURE__*/React.createElement(IOSKeyboard, {
    dark: dark
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 60,
      height: 34,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'flex-end',
      paddingBottom: 8,
      pointerEvents: 'none'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 139,
      height: 5,
      borderRadius: 100,
      background: dark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.25)'
    }
  })));
}

// ─────────────────────────────────────────────────────────────
// Keyboard — iOS 26 liquid glass
// ─────────────────────────────────────────────────────────────
function IOSKeyboard({
  dark = false
}) {
  const glyph = dark ? 'rgba(255,255,255,0.7)' : '#595959';
  const sugg = dark ? 'rgba(255,255,255,0.6)' : '#333';
  const keyBg = dark ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.85)';

  // special-key icons
  const icons = {
    shift: /*#__PURE__*/React.createElement("svg", {
      width: "19",
      height: "17",
      viewBox: "0 0 19 17"
    }, /*#__PURE__*/React.createElement("path", {
      d: "M9.5 1L1 9.5h4.5V16h8V9.5H18L9.5 1z",
      fill: glyph
    })),
    del: /*#__PURE__*/React.createElement("svg", {
      width: "23",
      height: "17",
      viewBox: "0 0 23 17"
    }, /*#__PURE__*/React.createElement("path", {
      d: "M7 1h13a2 2 0 012 2v11a2 2 0 01-2 2H7l-6-7.5L7 1z",
      fill: "none",
      stroke: glyph,
      strokeWidth: "1.6",
      strokeLinejoin: "round"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M10 5l7 7M17 5l-7 7",
      stroke: glyph,
      strokeWidth: "1.6",
      strokeLinecap: "round"
    })),
    ret: /*#__PURE__*/React.createElement("svg", {
      width: "20",
      height: "14",
      viewBox: "0 0 20 14"
    }, /*#__PURE__*/React.createElement("path", {
      d: "M18 1v6H4m0 0l4-4M4 7l4 4",
      fill: "none",
      stroke: "#fff",
      strokeWidth: "1.8",
      strokeLinecap: "round",
      strokeLinejoin: "round"
    }))
  };
  const key = (content, {
    w,
    flex,
    ret,
    fs = 25,
    k
  } = {}) => /*#__PURE__*/React.createElement("div", {
    key: k,
    style: {
      height: 42,
      borderRadius: 8.5,
      flex: flex ? 1 : undefined,
      width: w,
      minWidth: 0,
      background: ret ? '#08f' : keyBg,
      boxShadow: '0 1px 0 rgba(0,0,0,0.075)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: '-apple-system, "SF Compact", system-ui',
      fontSize: fs,
      fontWeight: 458,
      color: ret ? '#fff' : glyph
    }
  }, content);
  const row = (keys, pad = 0) => /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6.5,
      justifyContent: 'center',
      padding: `0 ${pad}px`
    }
  }, keys.map(l => key(l, {
    flex: true,
    k: l
  })));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      zIndex: 15,
      borderRadius: 27,
      overflow: 'hidden',
      padding: '11px 0 2px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      boxShadow: dark ? '0 -2px 20px rgba(0,0,0,0.09)' : '0 -1px 6px rgba(0,0,0,0.018), 0 -3px 20px rgba(0,0,0,0.012)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      borderRadius: 27,
      backdropFilter: 'blur(12px) saturate(180%)',
      WebkitBackdropFilter: 'blur(12px) saturate(180%)',
      background: dark ? 'rgba(120,120,128,0.14)' : 'rgba(255,255,255,0.25)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      borderRadius: 27,
      boxShadow: dark ? 'inset 1.5px 1.5px 1px rgba(255,255,255,0.15)' : 'inset 1.5px 1.5px 1px rgba(255,255,255,0.7), inset -1px -1px 1px rgba(255,255,255,0.4)',
      border: dark ? '0.5px solid rgba(255,255,255,0.15)' : '0.5px solid rgba(0,0,0,0.06)',
      pointerEvents: 'none'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 20,
      alignItems: 'center',
      padding: '8px 22px 13px',
      width: '100%',
      boxSizing: 'border-box',
      position: 'relative'
    }
  }, ['"The"', 'the', 'to'].map((w, i) => /*#__PURE__*/React.createElement(React.Fragment, {
    key: i
  }, i > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      width: 1,
      height: 25,
      background: '#ccc',
      opacity: 0.3
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      textAlign: 'center',
      fontFamily: '-apple-system, system-ui',
      fontSize: 17,
      color: sugg,
      letterSpacing: -0.43,
      lineHeight: '22px'
    }
  }, w)))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 13,
      padding: '0 6.5px',
      width: '100%',
      boxSizing: 'border-box',
      position: 'relative'
    }
  }, row(['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p']), row(['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'], 20), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 14.25,
      alignItems: 'center'
    }
  }, key(icons.shift, {
    w: 45,
    k: 'shift'
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6.5,
      flex: 1
    }
  }, ['z', 'x', 'c', 'v', 'b', 'n', 'm'].map(l => key(l, {
    flex: true,
    k: l
  }))), key(icons.del, {
    w: 45,
    k: 'del'
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6,
      alignItems: 'center'
    }
  }, key('ABC', {
    w: 92.25,
    fs: 18,
    k: 'abc'
  }), key('', {
    flex: true,
    k: 'space'
  }), key(icons.ret, {
    w: 92.25,
    ret: true,
    k: 'ret'
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 56,
      width: '100%',
      position: 'relative'
    }
  }));
}
Object.assign(window, {
  IOSDevice,
  IOSStatusBar,
  IOSNavBar,
  IOSGlassPill,
  IOSList,
  IOSListRow,
  IOSKeyboard
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/mobile/ios-frame.jsx", error: String((e && e.message) || e) }); }

// ui_kits/seo-geo/GeoVisibility.jsx
try { (() => {
// ABC SEO/GEO — GEO / AI Visibility screen. The differentiator: how visible
// the4sale.com is inside AI answer engines. Violet = the AI accent throughout.
const {
  Icon
} = window.SGIcons;

/* ── shared bits ─────────────────────────────────────────────── */
function Card({
  children,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--sg-card)',
      border: '1px solid var(--sg-border)',
      borderRadius: 'var(--sg-radius-lg)',
      boxShadow: 'var(--sg-shadow)',
      ...style
    }
  }, children);
}
function CardHead({
  title,
  sub,
  ai,
  right
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'flex-start',
      gap: 12,
      padding: '18px 20px 14px',
      borderBottom: '1px solid var(--sg-border)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8
    }
  }, ai && /*#__PURE__*/React.createElement(Icon, {
    name: "sparkles",
    size: 16,
    color: "var(--sg-violet-600)"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--sg-font-display)',
      fontWeight: 600,
      fontSize: 16,
      color: 'var(--sg-text)'
    }
  }, title)), sub && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12.5,
      color: 'var(--sg-text-2)',
      marginTop: 3
    }
  }, sub)), right);
}
function Delta({
  dir,
  children
}) {
  const map = {
    up: {
      c: 'var(--sg-green)',
      bg: 'var(--sg-green-50)',
      i: 'arrow-up'
    },
    down: {
      c: 'var(--sg-red)',
      bg: 'var(--sg-red-50)',
      i: 'arrow-down'
    },
    flat: {
      c: 'var(--sg-text-2)',
      bg: 'var(--sg-sunken)',
      i: 'minus'
    }
  };
  const m = map[dir];
  return /*#__PURE__*/React.createElement("span", {
    className: "sg-tnum",
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 3,
      fontSize: 12.5,
      fontWeight: 700,
      color: m.c,
      background: m.bg,
      padding: '3px 9px 3px 7px',
      borderRadius: 'var(--sg-radius-pill)'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: m.i,
    size: 13,
    strokeWidth: 2.6
  }), " ", children);
}

/* ── KPI cards ───────────────────────────────────────────────── */
function Kpi({
  label,
  value,
  unit,
  delta,
  dir,
  foot,
  accent
}) {
  return /*#__PURE__*/React.createElement(Card, {
    style: {
      padding: 18,
      animation: 'sg-rise 0.4s var(--sg-ease) both'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12.5,
      fontWeight: 600,
      color: 'var(--sg-text-2)'
    }
  }, label), accent && /*#__PURE__*/React.createElement(Icon, {
    name: "sparkles",
    size: 15,
    color: "var(--sg-violet-600)"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'baseline',
      gap: 4
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "sg-tnum",
    style: {
      fontFamily: 'var(--sg-font-display)',
      fontWeight: 700,
      fontSize: 36,
      letterSpacing: '-0.02em',
      color: accent ? 'var(--sg-violet-700)' : 'var(--sg-text)',
      lineHeight: 1
    }
  }, value), unit && /*#__PURE__*/React.createElement("span", {
    className: "sg-tnum",
    style: {
      fontSize: 16,
      fontWeight: 600,
      color: 'var(--sg-text-3)'
    }
  }, unit)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      marginTop: 14
    }
  }, /*#__PURE__*/React.createElement(Delta, {
    dir: dir
  }, delta), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      color: 'var(--sg-text-3)'
    }
  }, foot)));
}

/* ── engine breakdown ────────────────────────────────────────── */
const ENGINES = [{
  name: 'ChatGPT',
  tag: 'C',
  color: '#10A37F',
  vis: 71,
  mentions: 540,
  delta: '+12%',
  dir: 'up'
}, {
  name: 'Perplexity',
  tag: 'P',
  color: '#20808D',
  vis: 58,
  mentions: 286,
  delta: '+6%',
  dir: 'up'
}, {
  name: 'Google AI Overviews',
  tag: 'G',
  color: '#4285F4',
  vis: 49,
  mentions: 244,
  delta: '+21%',
  dir: 'up'
}, {
  name: 'Gemini',
  tag: 'G',
  color: '#8E75F0',
  vis: 44,
  mentions: 132,
  delta: '−4%',
  dir: 'down'
}, {
  name: 'Copilot',
  tag: 'C',
  color: '#0A6ED1',
  vis: 38,
  mentions: 82,
  delta: '+9%',
  dir: 'up'
}];
function EngineRow({
  e,
  i
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '210px 1fr 92px',
      alignItems: 'center',
      gap: 16,
      padding: '13px 20px',
      borderBottom: i < ENGINES.length - 1 ? '1px solid var(--sg-border)' : 'none'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 11,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 30,
      height: 30,
      borderRadius: 9,
      background: e.color,
      flex: 'none',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#fff',
      fontWeight: 700,
      fontSize: 14,
      fontFamily: 'var(--sg-font-display)'
    }
  }, e.tag), /*#__PURE__*/React.createElement("div", {
    style: {
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13.5,
      fontWeight: 600,
      color: 'var(--sg-text)',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap'
    }
  }, e.name), /*#__PURE__*/React.createElement("div", {
    className: "sg-tnum",
    style: {
      fontSize: 11.5,
      color: 'var(--sg-text-3)'
    }
  }, e.mentions.toLocaleString(), " mentions"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      height: 8,
      borderRadius: 999,
      background: 'var(--sg-violet-50)',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: e.vis + '%',
      height: '100%',
      borderRadius: 999,
      background: 'var(--sg-grad-violet)',
      transformOrigin: 'left',
      animation: 'sg-grow 0.7s var(--sg-ease) both',
      animationDelay: 0.1 + i * 0.07 + 's'
    }
  })), /*#__PURE__*/React.createElement("span", {
    className: "sg-tnum",
    style: {
      width: 40,
      textAlign: 'right',
      fontSize: 13.5,
      fontWeight: 700,
      color: 'var(--sg-violet-700)'
    }
  }, e.vis, "%")), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'right'
    }
  }, /*#__PURE__*/React.createElement(Delta, {
    dir: e.dir
  }, e.delta.replace(/[+−-]/, ''))));
}

/* ── trend area chart ────────────────────────────────────────── */
function TrendChart() {
  const data = [48, 50, 49, 52, 51, 54, 53, 56, 55, 58, 57, 60, 59, 62];
  const W = 560,
    H = 180,
    pad = 14;
  const dmin = 42,
    dmax = 66;
  const x = i => pad + i * (W - pad * 2) / (data.length - 1);
  const y = v => H - pad - (v - dmin) / (dmax - dmin) * (H - pad * 2);
  const line = data.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const area = `${line} L${x(data.length - 1).toFixed(1)},${H - pad} L${x(0).toFixed(1)},${H - pad} Z`;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '8px 16px 4px'
    }
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: `0 0 ${W} ${H}`,
    width: "100%",
    height: "180",
    preserveAspectRatio: "none",
    style: {
      display: 'block'
    }
  }, /*#__PURE__*/React.createElement("defs", null, /*#__PURE__*/React.createElement("linearGradient", {
    id: "sgArea",
    x1: "0",
    y1: "0",
    x2: "0",
    y2: "1"
  }, /*#__PURE__*/React.createElement("stop", {
    offset: "0%",
    stopColor: "#7C3AED",
    stopOpacity: "0.22"
  }), /*#__PURE__*/React.createElement("stop", {
    offset: "100%",
    stopColor: "#7C3AED",
    stopOpacity: "0"
  }))), [0, 1, 2, 3].map(g => /*#__PURE__*/React.createElement("line", {
    key: g,
    x1: pad,
    x2: W - pad,
    y1: pad + g * (H - pad * 2) / 3,
    y2: pad + g * (H - pad * 2) / 3,
    stroke: "var(--sg-border)",
    strokeWidth: "1",
    strokeDasharray: "3 4"
  })), /*#__PURE__*/React.createElement("path", {
    d: area,
    fill: "url(#sgArea)"
  }), /*#__PURE__*/React.createElement("path", {
    d: line,
    fill: "none",
    stroke: "var(--sg-violet-600)",
    strokeWidth: "2.5",
    strokeLinejoin: "round",
    strokeLinecap: "round"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: x(data.length - 1),
    cy: y(data[data.length - 1]),
    r: "5",
    fill: "var(--sg-violet-600)",
    stroke: "#fff",
    strokeWidth: "2.5"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      padding: '4px 14px 6px',
      fontSize: 11,
      color: 'var(--sg-text-3)'
    }
  }, /*#__PURE__*/React.createElement("span", null, "90 days ago"), /*#__PURE__*/React.createElement("span", null, "60d"), /*#__PURE__*/React.createElement("span", null, "30d"), /*#__PURE__*/React.createElement("span", null, "Today")));
}

/* ── prompts table ───────────────────────────────────────────── */
const SENT = {
  Positive: {
    c: 'var(--sg-green)',
    bg: 'var(--sg-green-50)'
  },
  Neutral: {
    c: 'var(--sg-text-2)',
    bg: 'var(--sg-sunken)'
  },
  Mixed: {
    c: 'var(--sg-amber)',
    bg: 'var(--sg-amber-50)'
  },
  Missing: {
    c: 'var(--sg-red)',
    bg: 'var(--sg-red-50)'
  }
};
const PROMPTS = [{
  q: 'best real estate deals in the GTA',
  engines: ['#10A37F', '#20808D', '#8E75F0'],
  pos: '#2',
  sent: 'Positive'
}, {
  q: 'how to find foreclosure listings in Ontario',
  engines: ['#10A37F', '#4285F4'],
  pos: '#4',
  sent: 'Neutral'
}, {
  q: 'trusted property investment platforms in Canada',
  engines: ['#20808D'],
  pos: '#6',
  sent: 'Mixed'
}, {
  q: 'the4sale.com reviews — is it legit?',
  engines: ['#10A37F', '#0A6ED1', '#8E75F0'],
  pos: '#1',
  sent: 'Positive'
}, {
  q: 'where to buy distressed properties in Toronto',
  engines: [],
  pos: '—',
  sent: 'Missing'
}];
function PromptRow({
  r,
  i
}) {
  const s = SENT[r.sent];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 110px 64px 96px',
      alignItems: 'center',
      gap: 14,
      padding: '13px 20px',
      borderBottom: i < PROMPTS.length - 1 ? '1px solid var(--sg-border)' : 'none'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 9,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "message-square",
    size: 15,
    color: "var(--sg-text-3)"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13.5,
      color: 'var(--sg-text)',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap'
    }
  }, "\"", r.q, "\"")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: -4
    }
  }, r.engines.length === 0 ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      color: 'var(--sg-text-3)'
    }
  }, "Not cited") : r.engines.map((c, k) => /*#__PURE__*/React.createElement("span", {
    key: k,
    style: {
      width: 22,
      height: 22,
      borderRadius: '50%',
      background: c,
      border: '2px solid var(--sg-card)',
      marginLeft: k ? -6 : 0
    }
  }))), /*#__PURE__*/React.createElement("span", {
    className: "sg-tnum",
    style: {
      fontSize: 13.5,
      fontWeight: 700,
      color: r.pos === '—' ? 'var(--sg-text-3)' : 'var(--sg-text)'
    }
  }, r.pos), /*#__PURE__*/React.createElement("span", {
    style: {
      justifySelf: 'start',
      fontSize: 11.5,
      fontWeight: 700,
      color: s.c,
      background: s.bg,
      padding: '3px 10px',
      borderRadius: 'var(--sg-radius-pill)'
    }
  }, r.sent));
}

/* ── next actions ────────────────────────────────────────────── */
const ACTIONS = [{
  t: 'Add an FAQ about foreclosure listings',
  d: "You're missing from 3 high-intent prompts buyers actually ask.",
  impact: 'High'
}, {
  t: 'Publish a "best platforms" comparison page',
  d: 'Competitors win this answer in ChatGPT and Perplexity today.',
  impact: 'High'
}, {
  t: 'Collect 5 more cited customer reviews',
  d: 'Trust signals AI engines read before recommending you.',
  impact: 'Medium'
}];
function ActionItem({
  a,
  i
}) {
  const [hover, setHover] = React.useState(false);
  const hi = a.impact === 'High';
  return /*#__PURE__*/React.createElement("div", {
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      display: 'flex',
      gap: 12,
      padding: '14px 16px',
      borderRadius: 'var(--sg-radius-md)',
      background: hover ? 'var(--sg-violet-50)' : 'transparent',
      cursor: 'pointer',
      transition: 'background 140ms var(--sg-ease)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 28,
      height: 28,
      borderRadius: 8,
      flex: 'none',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--sg-violet-100)',
      color: 'var(--sg-violet-700)',
      fontWeight: 700,
      fontSize: 13,
      fontFamily: 'var(--sg-font-display)'
    }
  }, i + 1), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13.5,
      fontWeight: 600,
      color: 'var(--sg-text)'
    }
  }, a.t), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 10,
      fontWeight: 700,
      letterSpacing: '0.04em',
      color: hi ? 'var(--sg-violet-700)' : 'var(--sg-text-2)',
      background: hi ? 'var(--sg-violet-100)' : 'var(--sg-sunken)',
      padding: '2px 7px',
      borderRadius: 'var(--sg-radius-pill)'
    }
  }, a.impact, " impact")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12.5,
      color: 'var(--sg-text-2)',
      marginTop: 3,
      lineHeight: 1.45
    }
  }, a.d)), /*#__PURE__*/React.createElement(Icon, {
    name: "chevron-right",
    size: 18,
    color: hover ? 'var(--sg-violet-600)' : 'var(--sg-text-3)',
    style: {
      alignSelf: 'center'
    }
  }));
}

/* ── screen ──────────────────────────────────────────────────── */
function GeoVisibility() {
  const [range, setRange] = React.useState(false);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 1180,
      margin: '0 auto',
      display: 'flex',
      flexDirection: 'column',
      gap: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'flex-end',
      gap: 16,
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 280
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11.5,
      fontWeight: 700,
      letterSpacing: '0.1em',
      textTransform: 'uppercase',
      color: 'var(--sg-violet-600)',
      marginBottom: 6
    }
  }, "Overview"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 11
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 38,
      height: 38,
      borderRadius: 11,
      background: 'var(--sg-grad-violet)',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: '0 6px 16px rgba(124,58,237,0.35)'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "sparkles",
    size: 20,
    color: "#fff"
  })), /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: 0,
      fontFamily: 'var(--sg-font-display)',
      fontWeight: 700,
      fontSize: 28,
      letterSpacing: '-0.02em',
      color: 'var(--sg-text)'
    }
  }, "GEO / AI Visibility")), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '10px 0 0',
      fontSize: 14,
      color: 'var(--sg-text-2)',
      maxWidth: 620,
      lineHeight: 1.5
    }
  }, "How often AI assistants mention ", /*#__PURE__*/React.createElement("strong", {
    style: {
      color: 'var(--sg-text)'
    }
  }, "the4sale.com"), " when Canadians ask about buying and selling property. Higher visibility = more customers find you inside ChatGPT, Perplexity, Gemini & more.")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setRange(r => !r),
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8,
      height: 42,
      padding: '0 14px',
      border: '1px solid var(--sg-border)',
      borderRadius: 'var(--sg-radius-pill)',
      background: 'var(--sg-card)',
      cursor: 'pointer',
      fontFamily: 'var(--sg-font-sans)',
      fontSize: 13.5,
      fontWeight: 600,
      color: 'var(--sg-text)'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "calendar",
    size: 16,
    color: "var(--sg-text-2)"
  }), " Last 30 days ", /*#__PURE__*/React.createElement(Icon, {
    name: "chevron-down",
    size: 15,
    color: "var(--sg-text-2)"
  })), /*#__PURE__*/React.createElement("button", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8,
      height: 42,
      padding: '0 18px',
      border: 'none',
      borderRadius: 'var(--sg-radius-pill)',
      cursor: 'pointer',
      fontFamily: 'var(--sg-font-sans)',
      fontWeight: 700,
      fontSize: 14,
      color: '#fff',
      background: 'var(--sg-grad-violet)',
      boxShadow: '0 4px 14px rgba(124,58,237,0.35)'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "refresh-cw",
    size: 16
  }), " Run AI check"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement(Kpi, {
    label: "AI Visibility Score",
    value: "62",
    unit: "/100",
    delta: "5 pts",
    dir: "up",
    foot: "up from 57",
    accent: true
  }), /*#__PURE__*/React.createElement(Kpi, {
    label: "AI mentions (30d)",
    value: "1,284",
    delta: "18.2%",
    dir: "up",
    foot: "vs prev. 30d"
  }), /*#__PURE__*/React.createElement(Kpi, {
    label: "Share of AI answers",
    value: "23",
    unit: "%",
    delta: "3.1 pts",
    dir: "up",
    foot: "vs 4 competitors"
  }), /*#__PURE__*/React.createElement(Kpi, {
    label: "Avg. answer position",
    value: "#2.8",
    delta: "0.4",
    dir: "up",
    foot: "when cited"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1.55fr 1fr',
      gap: 20,
      alignItems: 'start'
    }
  }, /*#__PURE__*/React.createElement(Card, null, /*#__PURE__*/React.createElement(CardHead, {
    ai: true,
    title: "How AI engines see you",
    sub: "Visibility = share of relevant prompts where you're cited",
    right: /*#__PURE__*/React.createElement("button", {
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        fontSize: 12.5,
        fontWeight: 600,
        color: 'var(--sg-violet-700)',
        background: 'none',
        border: 'none',
        cursor: 'pointer'
      }
    }, "Details ", /*#__PURE__*/React.createElement(Icon, {
      name: "chevron-right",
      size: 14
    }))
  }), /*#__PURE__*/React.createElement("div", null, ENGINES.map((e, i) => /*#__PURE__*/React.createElement(EngineRow, {
    key: e.name,
    e: e,
    i: i
  })))), /*#__PURE__*/React.createElement(Card, null, /*#__PURE__*/React.createElement(CardHead, {
    ai: true,
    title: "Visibility trend",
    sub: "AI Visibility Score over 90 days",
    right: /*#__PURE__*/React.createElement(Delta, {
      dir: "up"
    }, "+14")
  }), /*#__PURE__*/React.createElement(TrendChart, null), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      margin: '0 20px 16px',
      padding: '10px 12px',
      background: 'var(--sg-violet-50)',
      borderRadius: 'var(--sg-radius-md)'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "trending-up",
    size: 16,
    color: "var(--sg-violet-700)"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12.5,
      color: 'var(--sg-text)'
    }
  }, "Steady climb \u2014 you've gained ", /*#__PURE__*/React.createElement("strong", null, "14 points"), " since spring.")))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1.55fr 1fr',
      gap: 20,
      alignItems: 'start'
    }
  }, /*#__PURE__*/React.createElement(Card, null, /*#__PURE__*/React.createElement(CardHead, {
    title: "Prompts where you show up",
    sub: "Real questions Canadians ask AI assistants",
    right: /*#__PURE__*/React.createElement("button", {
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        fontSize: 12.5,
        fontWeight: 600,
        color: 'var(--sg-text-2)',
        background: 'var(--sg-sunken)',
        border: '1px solid var(--sg-border)',
        borderRadius: 'var(--sg-radius-pill)',
        padding: '6px 12px',
        cursor: 'pointer'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "external-link",
      size: 13
    }), " All 124 prompts")
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 110px 64px 96px',
      gap: 14,
      padding: '10px 20px',
      borderBottom: '1px solid var(--sg-border)',
      fontSize: 10.5,
      fontWeight: 700,
      letterSpacing: '0.06em',
      textTransform: 'uppercase',
      color: 'var(--sg-text-3)'
    }
  }, /*#__PURE__*/React.createElement("span", null, "Prompt"), /*#__PURE__*/React.createElement("span", null, "Cited in"), /*#__PURE__*/React.createElement("span", null, "Position"), /*#__PURE__*/React.createElement("span", null, "Sentiment")), /*#__PURE__*/React.createElement("div", null, PROMPTS.map((r, i) => /*#__PURE__*/React.createElement(PromptRow, {
    key: i,
    r: r,
    i: i
  })))), /*#__PURE__*/React.createElement(Card, {
    style: {
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '18px 20px 14px',
      borderBottom: '1px solid var(--sg-border)',
      background: 'var(--sg-violet-50)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "zap",
    size: 16,
    color: "var(--sg-violet-600)"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--sg-font-display)',
      fontWeight: 600,
      fontSize: 16,
      color: 'var(--sg-text)'
    }
  }, "What to do next")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12.5,
      color: 'var(--sg-text-2)',
      marginTop: 3
    }
  }, "Plain-English moves that lift your AI visibility fastest.")), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '8px 6px'
    }
  }, ACTIONS.map((a, i) => /*#__PURE__*/React.createElement(ActionItem, {
    key: i,
    a: a,
    i: i
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '4px 16px 18px'
    }
  }, /*#__PURE__*/React.createElement("button", {
    style: {
      width: '100%',
      height: 42,
      border: '1px solid var(--sg-violet-200)',
      borderRadius: 'var(--sg-radius-pill)',
      background: 'var(--sg-card)',
      color: 'var(--sg-violet-700)',
      fontFamily: 'var(--sg-font-sans)',
      fontWeight: 700,
      fontSize: 13.5,
      cursor: 'pointer',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7
    }
  }, "See full GEO action plan ", /*#__PURE__*/React.createElement(Icon, {
    name: "arrow-right",
    size: 16
  }))))));
}
window.SGGeoVisibility = GeoVisibility;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/seo-geo/GeoVisibility.jsx", error: String((e && e.message) || e) }); }

// ui_kits/seo-geo/SGApp.jsx
try { (() => {
// ABC SEO/GEO — app shell. Composes sidebar, top bar, routed screens.
const {
  Icon
} = window.SGIcons;
const PLACEHOLDERS = {
  settings: {
    icon: 'settings',
    title: 'Settings',
    body: 'Manage projects, team access, integrations, and your white-label branding.'
  }
};
function Placeholder({
  p
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 16,
      padding: '90px 20px',
      textAlign: 'center',
      animation: 'sg-fade 0.3s var(--sg-ease)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 64,
      height: 64,
      borderRadius: 'var(--sg-radius-xl)',
      background: 'var(--sg-blue-50)',
      color: 'var(--sg-blue-600)',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: p.icon,
    size: 30
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--sg-font-display)',
      fontWeight: 600,
      fontSize: 22,
      color: 'var(--sg-text)'
    }
  }, p.title), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      color: 'var(--sg-text-2)',
      maxWidth: 440,
      lineHeight: 1.55
    }
  }, p.body), /*#__PURE__*/React.createElement("button", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8,
      height: 44,
      padding: '0 22px',
      marginTop: 6,
      border: 'none',
      borderRadius: 'var(--sg-radius-pill)',
      cursor: 'pointer',
      fontFamily: 'var(--sg-font-sans)',
      fontWeight: 700,
      fontSize: 14,
      color: '#fff',
      background: 'var(--sg-grad-brand)',
      boxShadow: '0 4px 14px rgba(37,99,235,0.32)'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 16
  }), " Get started"));
}
function SGApp() {
  const [route, setRoute] = React.useState('dashboard');
  const [collapsed, setCollapsed] = React.useState(false);
  let screen;
  if (route === 'dashboard') screen = /*#__PURE__*/React.createElement(window.SGDashboard, null);else if (route === 'geo') screen = /*#__PURE__*/React.createElement(window.SGGeoVisibility, null);else if (route === 'audit') screen = /*#__PURE__*/React.createElement(window.SGSiteAudit, null);else if (route === 'keywords') screen = /*#__PURE__*/React.createElement(window.SGKeywords, null);else if (route === 'rank') screen = /*#__PURE__*/React.createElement(window.SGRankTracking, null);else if (route === 'competitors') screen = /*#__PURE__*/React.createElement(window.SGCompetitors, null);else if (route === 'backlinks') screen = /*#__PURE__*/React.createElement(window.SGBacklinks, null);else if (route === 'reports') screen = /*#__PURE__*/React.createElement(window.SGReports, null);else screen = /*#__PURE__*/React.createElement(Placeholder, {
    p: PLACEHOLDERS[route]
  });
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      height: '100vh',
      overflow: 'hidden',
      background: 'var(--sg-page)'
    }
  }, /*#__PURE__*/React.createElement(window.SGSidebar, {
    active: route,
    onNavigate: setRoute,
    collapsed: collapsed
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement(window.SGTopBar, {
    onToggleSidebar: () => setCollapsed(c => !c),
    onNewAudit: () => setRoute('audit')
  }), /*#__PURE__*/React.createElement("main", {
    style: {
      flex: 1,
      overflow: 'auto',
      padding: '26px 28px 48px'
    }
  }, screen)));
}
window.SGApp = SGApp;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/seo-geo/SGApp.jsx", error: String((e && e.message) || e) }); }

// ui_kits/seo-geo/SGAuth.jsx
try { (() => {
// ABC SEO/GEO — Block 5: Login + Subscription paywall (standalone, pre-auth).
// Billing brokered through GoHighLevel. Toggles between Sign-in and Plans.
(function () {
  const {
    Icon
  } = window.SGIcons;
  const BULLETS = [{
    icon: 'trending-up',
    t: 'Track rankings & site health',
    d: 'Every keyword, page, and crawl issue in one place.'
  }, {
    icon: 'sparkles',
    t: 'See how AI engines recommend you',
    d: 'Visibility inside ChatGPT, Perplexity, Gemini & more.',
    ai: true
  }, {
    icon: 'check',
    t: 'Plain-English fixes, prioritized',
    d: 'No SEO degree required — just do the next thing.'
  }];
  function BrandPanel() {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        flex: '1 1 46%',
        minWidth: 320,
        background: 'var(--sg-grad-navy)',
        color: '#fff',
        padding: '48px 52px',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        top: -60,
        right: -40,
        width: 260,
        height: 260,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(124,58,237,0.40), transparent 70%)'
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        bottom: -80,
        left: -60,
        width: 280,
        height: 280,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(37,99,235,0.30), transparent 70%)'
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 11,
        position: 'relative'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: 36,
        height: 36,
        borderRadius: 10,
        background: 'var(--sg-grad-brand)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 4px 12px rgba(37,99,235,0.5)'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "play",
      size: 16,
      color: "#fff"
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: 'var(--sg-font-logo)',
        fontWeight: 600,
        fontSize: 18
      }
    }, "ABC ", /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--sg-violet-500)'
      }
    }, "SEO/GEO"))), /*#__PURE__*/React.createElement("div", {
      style: {
        margin: 'auto 0',
        position: 'relative'
      }
    }, /*#__PURE__*/React.createElement("h1", {
      style: {
        fontFamily: 'var(--sg-font-display)',
        fontWeight: 700,
        fontSize: 40,
        lineHeight: 1.1,
        letterSpacing: '-0.02em',
        margin: '0 0 16px',
        maxWidth: 460
      }
    }, "See your business the way ", /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--sg-violet-500)'
      }
    }, "AI sees it.")), /*#__PURE__*/React.createElement("p", {
      style: {
        fontSize: 15.5,
        color: 'rgba(226,232,240,0.78)',
        lineHeight: 1.55,
        margin: '0 0 36px',
        maxWidth: 440
      }
    }, "The first platform that tracks classic SEO and your visibility inside AI answer engines \u2014 together."), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
        maxWidth: 440
      }
    }, BULLETS.map(b => /*#__PURE__*/React.createElement("div", {
      key: b.t,
      style: {
        display: 'flex',
        gap: 14,
        alignItems: 'flex-start'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: 38,
        height: 38,
        borderRadius: 11,
        flex: 'none',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: b.ai ? 'rgba(139,92,246,0.22)' : 'rgba(255,255,255,0.10)',
        color: b.ai ? 'var(--sg-violet-500)' : '#fff'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: b.icon,
      size: 18,
      strokeWidth: 2.2
    })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontWeight: 700,
        fontSize: 14.5
      }
    }, b.t), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        color: 'rgba(226,232,240,0.66)',
        marginTop: 3,
        lineHeight: 1.45
      }
    }, b.d)))))), /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'relative',
        fontSize: 12,
        color: 'rgba(148,163,184,0.7)'
      }
    }, "4,000+ Canadian businesses tracked"));
  }
  function SgInput({
    label,
    type,
    placeholder,
    value,
    onChange
  }) {
    const [focus, setFocus] = React.useState(false);
    return /*#__PURE__*/React.createElement("label", {
      style: {
        display: 'block'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'block',
        fontSize: 13,
        fontWeight: 600,
        color: 'var(--sg-text)',
        marginBottom: 7
      }
    }, label), /*#__PURE__*/React.createElement("input", {
      type: type,
      placeholder: placeholder,
      value: value,
      onChange: onChange,
      onFocus: () => setFocus(true),
      onBlur: () => setFocus(false),
      style: {
        width: '100%',
        height: 46,
        padding: '0 14px',
        borderRadius: 'var(--sg-radius-md)',
        fontFamily: 'var(--sg-font-sans)',
        fontSize: 14,
        color: 'var(--sg-text)',
        background: 'var(--sg-card)',
        border: `1px solid ${focus ? 'var(--sg-blue-500)' : 'var(--sg-border)'}`,
        outline: 'none',
        boxShadow: focus ? 'var(--sg-ring)' : 'none',
        transition: 'all 140ms var(--sg-ease)'
      }
    }));
  }
  function LoginForm({
    onPlans
  }) {
    const [email, setEmail] = React.useState('al@the4sale.com');
    const [pw, setPw] = React.useState('');
    return /*#__PURE__*/React.createElement("div", {
      style: {
        flex: '1 1 54%',
        minWidth: 340,
        background: 'var(--sg-page)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: '100%',
        maxWidth: 380
      }
    }, /*#__PURE__*/React.createElement("h2", {
      style: {
        fontFamily: 'var(--sg-font-display)',
        fontWeight: 700,
        fontSize: 26,
        letterSpacing: '-0.02em',
        color: 'var(--sg-text)',
        margin: '0 0 6px'
      }
    }, "Welcome back"), /*#__PURE__*/React.createElement("p", {
      style: {
        fontSize: 14,
        color: 'var(--sg-text-2)',
        margin: '0 0 28px'
      }
    }, "Sign in to your SEO + GEO dashboard."), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 16
      }
    }, /*#__PURE__*/React.createElement(SgInput, {
      label: "Work email",
      type: "email",
      placeholder: "you@company.com",
      value: email,
      onChange: e => setEmail(e.target.value)
    }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        marginBottom: 7
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 13,
        fontWeight: 600,
        color: 'var(--sg-text)'
      }
    }, "Password"), /*#__PURE__*/React.createElement("a", {
      style: {
        fontSize: 12.5,
        fontWeight: 600,
        color: 'var(--sg-blue-600)',
        cursor: 'pointer',
        textDecoration: 'none'
      }
    }, "Forgot?")), /*#__PURE__*/React.createElement(SgInput, {
      type: "password",
      placeholder: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022",
      value: pw,
      onChange: e => setPw(e.target.value)
    }))), /*#__PURE__*/React.createElement("button", {
      style: {
        width: '100%',
        height: 48,
        marginTop: 22,
        border: 'none',
        borderRadius: 'var(--sg-radius-pill)',
        cursor: 'pointer',
        fontFamily: 'var(--sg-font-sans)',
        fontWeight: 700,
        fontSize: 15,
        color: '#fff',
        background: 'var(--sg-grad-brand)',
        boxShadow: '0 4px 14px rgba(37,99,235,0.32)'
      }
    }, "Sign in"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        margin: '20px 0'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1,
        height: 1,
        background: 'var(--sg-border)'
      }
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 12,
        color: 'var(--sg-text-3)'
      }
    }, "or"), /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1,
        height: 1,
        background: 'var(--sg-border)'
      }
    })), /*#__PURE__*/React.createElement("button", {
      style: {
        width: '100%',
        height: 48,
        border: '1px solid var(--sg-border)',
        borderRadius: 'var(--sg-radius-pill)',
        cursor: 'pointer',
        fontFamily: 'var(--sg-font-sans)',
        fontWeight: 700,
        fontSize: 14,
        color: 'var(--sg-text)',
        background: 'var(--sg-card)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "zap",
      size: 16,
      color: "var(--sg-violet-600)"
    }), " Email me a magic link"), /*#__PURE__*/React.createElement("p", {
      style: {
        textAlign: 'center',
        fontSize: 13.5,
        color: 'var(--sg-text-2)',
        marginTop: 26
      }
    }, "New here? ", /*#__PURE__*/React.createElement("a", {
      onClick: onPlans,
      style: {
        fontWeight: 700,
        color: 'var(--sg-blue-600)',
        cursor: 'pointer'
      }
    }, "See plans \u2192")), /*#__PURE__*/React.createElement("div", {
      style: {
        textAlign: 'center',
        fontSize: 11.5,
        color: 'var(--sg-text-3)',
        marginTop: 30
      }
    }, "Powered by AI Biz Connect")));
  }

  /* ── pricing ── */
  const TIERS = [{
    name: 'Starter',
    tagline: 'For solo owners getting started',
    m: 29,
    popular: false,
    features: ['Monthly site audit', 'GEO AI-Visibility score', 'Up to 25 tracked keywords', '1 site / project', 'Email support']
  }, {
    name: 'Growth',
    tagline: 'For businesses serious about growth',
    m: 79,
    popular: true,
    features: ['Everything in Starter', 'Weekly audits + rank tracking', 'Up to 250 keywords', 'Competitor tracking', 'Full GEO action plans', 'Priority support']
  }, {
    name: 'Agency',
    tagline: 'For agencies & multi-site teams',
    m: 199,
    popular: false,
    features: ['Everything in Growth', 'Unlimited sites & keywords', 'White-label client reports', 'Team seats & roles', 'API access', 'Dedicated manager']
  }];
  function Pricing({
    onBack
  }) {
    const [annual, setAnnual] = React.useState(true);
    return /*#__PURE__*/React.createElement("div", {
      style: {
        minHeight: '100vh',
        width: '100%',
        background: 'var(--sg-page)',
        padding: '40px 24px 56px',
        overflowY: 'auto'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        maxWidth: 1040,
        margin: '0 auto'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 11,
        marginBottom: 26
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: 32,
        height: 32,
        borderRadius: 9,
        background: 'var(--sg-grad-brand)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "play",
      size: 14,
      color: "#fff"
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: 'var(--sg-font-logo)',
        fontWeight: 600,
        fontSize: 17,
        color: 'var(--sg-text)'
      }
    }, "ABC ", /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--sg-violet-600)'
      }
    }, "SEO/GEO")), /*#__PURE__*/React.createElement("a", {
      onClick: onBack,
      style: {
        marginLeft: 'auto',
        fontSize: 13.5,
        fontWeight: 600,
        color: 'var(--sg-blue-600)',
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5
      }
    }, "\u2190 Back to sign in")), /*#__PURE__*/React.createElement("div", {
      style: {
        textAlign: 'center',
        marginBottom: 30
      }
    }, /*#__PURE__*/React.createElement("h1", {
      style: {
        fontFamily: 'var(--sg-font-display)',
        fontWeight: 700,
        fontSize: 34,
        letterSpacing: '-0.02em',
        color: 'var(--sg-text)',
        margin: '0 0 10px'
      }
    }, "Choose your plan"), /*#__PURE__*/React.createElement("p", {
      style: {
        fontSize: 15,
        color: 'var(--sg-text-2)',
        margin: '0 0 22px'
      }
    }, "Track SEO and AI visibility together. Cancel anytime."), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        background: 'var(--sg-card)',
        border: '1px solid var(--sg-border)',
        borderRadius: 'var(--sg-radius-pill)',
        padding: 4
      }
    }, [['monthly', false], ['annual', true]].map(([label, val]) => /*#__PURE__*/React.createElement("button", {
      key: label,
      onClick: () => setAnnual(val),
      style: {
        height: 34,
        padding: '0 18px',
        border: 'none',
        borderRadius: 'var(--sg-radius-pill)',
        cursor: 'pointer',
        textTransform: 'capitalize',
        fontFamily: 'var(--sg-font-sans)',
        fontWeight: 600,
        fontSize: 13,
        background: annual === val ? 'var(--sg-grad-brand)' : 'transparent',
        color: annual === val ? '#fff' : 'var(--sg-text-2)'
      }
    }, label, label === 'annual' && /*#__PURE__*/React.createElement("span", {
      style: {
        marginLeft: 6,
        fontSize: 11,
        opacity: 0.9
      }
    }, "\u221220%"))))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 18,
        alignItems: 'start'
      }
    }, TIERS.map(t => {
      const price = annual ? Math.round(t.m * 0.8) : t.m;
      return /*#__PURE__*/React.createElement("div", {
        key: t.name,
        style: {
          background: 'var(--sg-card)',
          borderRadius: 'var(--sg-radius-lg)',
          overflow: 'hidden',
          border: t.popular ? '2px solid var(--sg-violet-600)' : '1px solid var(--sg-border)',
          boxShadow: t.popular ? 'var(--sg-shadow-lg)' : 'var(--sg-shadow)',
          transform: t.popular ? 'translateY(-6px)' : 'none',
          position: 'relative'
        }
      }, t.popular && /*#__PURE__*/React.createElement("div", {
        style: {
          background: 'var(--sg-grad-violet)',
          color: '#fff',
          textAlign: 'center',
          fontSize: 11.5,
          fontWeight: 700,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          padding: '7px 0'
        }
      }, "Most popular"), /*#__PURE__*/React.createElement("div", {
        style: {
          padding: 26
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          fontFamily: 'var(--sg-font-display)',
          fontWeight: 700,
          fontSize: 20,
          color: 'var(--sg-text)'
        }
      }, t.name), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 13,
          color: 'var(--sg-text-2)',
          marginTop: 4,
          marginBottom: 18
        }
      }, t.tagline), /*#__PURE__*/React.createElement("div", {
        style: {
          display: 'flex',
          alignItems: 'baseline',
          gap: 4
        }
      }, /*#__PURE__*/React.createElement("span", {
        className: "sg-tnum",
        style: {
          fontFamily: 'var(--sg-font-display)',
          fontWeight: 700,
          fontSize: 40,
          letterSpacing: '-0.02em',
          color: 'var(--sg-text)'
        }
      }, "$", price), /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 14,
          color: 'var(--sg-text-3)'
        }
      }, "/mo CAD")), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 12,
          color: 'var(--sg-text-3)',
          margintop: 4,
          minHeight: 16
        }
      }, annual ? 'billed annually' : 'billed monthly'), /*#__PURE__*/React.createElement("button", {
        style: {
          width: '100%',
          height: 46,
          margin: '20px 0 22px',
          border: t.popular ? 'none' : '1px solid var(--sg-border-2)',
          borderRadius: 'var(--sg-radius-pill)',
          cursor: 'pointer',
          fontFamily: 'var(--sg-font-sans)',
          fontWeight: 700,
          fontSize: 14.5,
          color: t.popular ? '#fff' : 'var(--sg-text)',
          background: t.popular ? 'var(--sg-grad-violet)' : 'var(--sg-card)',
          boxShadow: t.popular ? '0 6px 16px rgba(124,58,237,0.32)' : 'none'
        }
      }, t.name === 'Agency' ? 'Talk to sales' : 'Start free trial'), /*#__PURE__*/React.createElement("div", {
        style: {
          display: 'flex',
          flexDirection: 'column',
          gap: 12
        }
      }, t.features.map(f => /*#__PURE__*/React.createElement("div", {
        key: f,
        style: {
          display: 'flex',
          gap: 10,
          alignItems: 'flex-start',
          fontSize: 13.5,
          color: 'var(--sg-text)'
        }
      }, /*#__PURE__*/React.createElement(Icon, {
        name: "check",
        size: 17,
        color: t.popular ? 'var(--sg-violet-600)' : 'var(--sg-green)',
        strokeWidth: 2.6,
        style: {
          flex: 'none',
          marginTop: 1
        }
      }), /*#__PURE__*/React.createElement("span", null, f))))));
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        textAlign: 'center',
        fontSize: 12,
        color: 'var(--sg-text-3)',
        marginTop: 26,
        display: 'inline-flex',
        gap: 6,
        width: '100%',
        justifyContent: 'center',
        alignItems: 'center'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "check",
      size: 13,
      color: "var(--sg-green)"
    }), " Secure billing handled by GoHighLevel \xB7 14-day free trial \xB7 no card to start")));
  }
  function Auth() {
    const [view, setView] = React.useState('login');
    if (view === 'plans') return /*#__PURE__*/React.createElement(Pricing, {
      onBack: () => setView('login')
    });
    return /*#__PURE__*/React.createElement("div", {
      style: {
        minHeight: '100vh',
        display: 'flex',
        flexWrap: 'wrap'
      }
    }, /*#__PURE__*/React.createElement(BrandPanel, null), /*#__PURE__*/React.createElement(LoginForm, {
      onPlans: () => setView('plans')
    }));
  }
  window.SGAuth = Auth;
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/seo-geo/SGAuth.jsx", error: String((e && e.message) || e) }); }

// ui_kits/seo-geo/SGBacklinks.jsx
try { (() => {
// ABC SEO/GEO — Block 9: Backlinks (populated).
(function () {
  const {
    Icon
  } = window.SGIcons;
  const {
    Card,
    CardHead,
    Delta,
    PageHead
  } = window.SGKit;
  const STATS = [{
    label: 'Total backlinks',
    value: '412',
    delta: '12',
    dir: 'up'
  }, {
    label: 'Referring domains',
    value: '148',
    delta: '5',
    dir: 'up'
  }, {
    label: 'Authority score',
    value: '32',
    sub: '/100'
  }, {
    label: 'Toxic links',
    value: '7',
    warn: true
  }, {
    label: 'New / Lost (30d)',
    value: '24 / 9',
    split: true
  }];
  function StatRow() {
    return /*#__PURE__*/React.createElement(Card, {
      style: {
        display: 'grid',
        gridTemplateColumns: 'repeat(5,1fr)',
        overflow: 'hidden'
      }
    }, STATS.map((s, i) => /*#__PURE__*/React.createElement("div", {
      key: s.label,
      style: {
        padding: '18px 20px',
        borderLeft: i ? '1px solid var(--sg-border)' : 'none'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        fontSize: 12,
        fontWeight: 600,
        color: 'var(--sg-text-2)',
        marginBottom: 8
      }
    }, s.warn && /*#__PURE__*/React.createElement(Icon, {
      name: "alert-triangle",
      size: 13,
      color: "var(--sg-amber)"
    }), s.label), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'baseline',
        gap: 8
      }
    }, s.split ? /*#__PURE__*/React.createElement("span", {
      className: "sg-tnum",
      style: {
        fontFamily: 'var(--sg-font-display)',
        fontWeight: 700,
        fontSize: 24,
        lineHeight: 1
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--sg-green)'
      }
    }, "24"), /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--sg-text-3)'
      }
    }, " / "), /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--sg-red)'
      }
    }, "9")) : /*#__PURE__*/React.createElement("span", {
      className: "sg-tnum",
      style: {
        fontFamily: 'var(--sg-font-display)',
        fontWeight: 700,
        fontSize: 26,
        letterSpacing: '-0.02em',
        color: s.warn ? 'var(--sg-amber)' : 'var(--sg-text)',
        lineHeight: 1
      }
    }, s.value, s.sub && /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 15,
        color: 'var(--sg-text-3)'
      }
    }, s.sub)), s.delta && /*#__PURE__*/React.createElement(Delta, {
      dir: s.dir
    }, s.delta)))));
  }

  /* new vs lost trend */
  function NewLostTrend() {
    const newD = [14, 9, 12, 18, 11, 16, 21, 17, 22, 19, 24];
    const lostD = [6, 8, 5, 7, 9, 6, 4, 8, 7, 5, 9];
    const W = 360,
      H = 170,
      padX = 14,
      padT = 14,
      padB = 22;
    const max = 26;
    const x = i => padX + i * (W - padX * 2) / (newD.length - 1);
    const y = v => padT + (1 - v / max) * (H - padT - padB);
    const path = arr => arr.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
    return /*#__PURE__*/React.createElement(Card, null, /*#__PURE__*/React.createElement(CardHead, {
      title: "New vs lost links",
      sub: "Last 11 weeks",
      right: /*#__PURE__*/React.createElement("div", {
        style: {
          display: 'flex',
          gap: 14
        }
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 12,
          fontWeight: 600,
          color: 'var(--sg-text-2)'
        }
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          width: 12,
          height: 3,
          borderRadius: 2,
          background: 'var(--sg-green)'
        }
      }), " New"), /*#__PURE__*/React.createElement("span", {
        style: {
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 12,
          fontWeight: 600,
          color: 'var(--sg-text-2)'
        }
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          width: 12,
          height: 3,
          borderRadius: 2,
          background: 'var(--sg-red)'
        }
      }), " Lost"))
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        padding: '14px 16px 8px'
      }
    }, /*#__PURE__*/React.createElement("svg", {
      viewBox: `0 0 ${W} ${H}`,
      width: "100%",
      height: "170",
      preserveAspectRatio: "none",
      style: {
        display: 'block'
      }
    }, [0, 1, 2].map(g => /*#__PURE__*/React.createElement("line", {
      key: g,
      x1: padX,
      x2: W - padX,
      y1: padT + g * (H - padT - padB) / 2,
      y2: padT + g * (H - padT - padB) / 2,
      stroke: "var(--sg-border)",
      strokeWidth: "1",
      strokeDasharray: "3 4"
    })), /*#__PURE__*/React.createElement("path", {
      d: path(newD),
      fill: "none",
      stroke: "var(--sg-green)",
      strokeWidth: "2.5",
      strokeLinejoin: "round",
      strokeLinecap: "round"
    }), /*#__PURE__*/React.createElement("path", {
      d: path(lostD),
      fill: "none",
      stroke: "var(--sg-red)",
      strokeWidth: "2.5",
      strokeLinejoin: "round",
      strokeLinecap: "round"
    }), /*#__PURE__*/React.createElement("circle", {
      cx: x(newD.length - 1),
      cy: y(newD[newD.length - 1]),
      r: "4.5",
      fill: "var(--sg-green)",
      stroke: "#fff",
      strokeWidth: "2.5"
    }), /*#__PURE__*/React.createElement("circle", {
      cx: x(lostD.length - 1),
      cy: y(lostD[lostD.length - 1]),
      r: "4.5",
      fill: "var(--sg-red)",
      stroke: "#fff",
      strokeWidth: "2.5"
    }))));
  }
  function ToxicCallout() {
    return /*#__PURE__*/React.createElement(Card, {
      style: {
        padding: 22,
        display: 'flex',
        flexDirection: 'column'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        marginBottom: 14
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: 44,
        height: 44,
        borderRadius: 12,
        background: 'var(--sg-amber-50)',
        color: 'var(--sg-amber)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flex: 'none'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "alert-triangle",
      size: 22
    })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      className: "sg-tnum",
      style: {
        fontFamily: 'var(--sg-font-display)',
        fontWeight: 700,
        fontSize: 22,
        color: 'var(--sg-text)',
        lineHeight: 1
      }
    }, "7 toxic links"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12.5,
        color: 'var(--sg-text-2)',
        marginTop: 4
      }
    }, "from 5 low-quality domains"))), /*#__PURE__*/React.createElement("p", {
      style: {
        fontSize: 13,
        color: 'var(--sg-text-2)',
        lineHeight: 1.55,
        margin: '0 0 16px'
      }
    }, "These links may hurt your rankings. Review and disavow them so Google ignores them \u2014 we'll prepare the file for you."), /*#__PURE__*/React.createElement("button", {
      style: {
        marginTop: 'auto',
        width: '100%',
        height: 42,
        border: 'none',
        borderRadius: 'var(--sg-radius-pill)',
        cursor: 'pointer',
        fontFamily: 'var(--sg-font-sans)',
        fontWeight: 700,
        fontSize: 14,
        color: '#fff',
        background: 'var(--sg-amber)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "alert-triangle",
      size: 16
    }), " Review & disavow"));
  }
  function Auth({
    v
  }) {
    const c = v >= 60 ? 'var(--sg-green)' : v >= 30 ? 'var(--sg-amber)' : 'var(--sg-red)';
    const bg = v >= 60 ? 'var(--sg-green-50)' : v >= 30 ? 'var(--sg-amber-50)' : 'var(--sg-red-50)';
    return /*#__PURE__*/React.createElement("span", {
      className: "sg-tnum",
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 34,
        height: 24,
        padding: '0 8px',
        fontSize: 12.5,
        fontWeight: 700,
        color: c,
        background: bg,
        borderRadius: 'var(--sg-radius-sm)'
      }
    }, v);
  }
  function TypePill({
    t
  }) {
    const dofollow = t === 'Dofollow';
    return /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 11.5,
        fontWeight: 700,
        color: dofollow ? 'var(--sg-blue-600)' : 'var(--sg-text-2)',
        background: dofollow ? 'var(--sg-blue-50)' : 'var(--sg-sunken)',
        padding: '3px 10px',
        borderRadius: 'var(--sg-radius-pill)'
      }
    }, t);
  }
  function StatusPill({
    s
  }) {
    const m = {
      New: {
        c: 'var(--sg-green)',
        bg: 'var(--sg-green-50)'
      },
      Lost: {
        c: 'var(--sg-red)',
        bg: 'var(--sg-red-50)'
      },
      Active: {
        c: 'var(--sg-text-2)',
        bg: 'var(--sg-sunken)'
      }
    }[s];
    return /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 11.5,
        fontWeight: 700,
        color: m.c,
        background: m.bg,
        padding: '3px 10px',
        borderRadius: 'var(--sg-radius-pill)'
      }
    }, s);
  }
  const DOMAINS = [{
    domain: 'blogto.com',
    auth: 78,
    links: 12,
    seen: 'Jun 2026',
    type: 'Dofollow',
    status: 'New'
  }, {
    domain: 'thestar.com',
    auth: 86,
    links: 4,
    seen: 'May 2026',
    type: 'Dofollow',
    status: 'Active'
  }, {
    domain: 'narcity.com',
    auth: 64,
    links: 7,
    seen: 'Jun 2026',
    type: 'Dofollow',
    status: 'New'
  }, {
    domain: 'realestatemagazine.ca',
    auth: 52,
    links: 9,
    seen: 'Apr 2026',
    type: 'Dofollow',
    status: 'Active'
  }, {
    domain: 'storeys.com',
    auth: 49,
    links: 5,
    seen: 'Jun 2026',
    type: 'Nofollow',
    status: 'New'
  }, {
    domain: 'movesmartly.com',
    auth: 41,
    links: 6,
    seen: 'Mar 2026',
    type: 'Dofollow',
    status: 'Active'
  }, {
    domain: 'gtahomehub.info',
    auth: 18,
    links: 3,
    seen: 'May 2026',
    type: 'Dofollow',
    status: 'Lost'
  }, {
    domain: 'cheap-seo-links.biz',
    auth: 6,
    links: 14,
    seen: 'Feb 2026',
    type: 'Dofollow',
    status: 'Active',
    toxic: true
  }, {
    domain: 'directory-spam.net',
    auth: 9,
    links: 8,
    seen: 'Jan 2026',
    type: 'Nofollow',
    status: 'Active',
    toxic: true
  }, {
    domain: 'torontolife.com',
    auth: 81,
    links: 2,
    seen: 'Jun 2026',
    type: 'Dofollow',
    status: 'New'
  }];
  function DomainRow({
    r,
    last
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: '1fr 80px 70px 110px 110px 90px',
        alignItems: 'center',
        gap: 14,
        padding: '13px 20px',
        borderBottom: last ? 'none' : '1px solid var(--sg-border)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: 26,
        height: 26,
        borderRadius: 7,
        background: 'var(--sg-sunken)',
        color: 'var(--sg-text-2)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flex: 'none'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "globe",
      size: 14
    })), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 13.5,
        fontWeight: 500,
        color: 'var(--sg-text)',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap'
      }
    }, r.domain), r.toxic && /*#__PURE__*/React.createElement("span", {
      title: "Toxic",
      style: {
        flex: 'none',
        color: 'var(--sg-amber)',
        display: 'inline-flex'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "alert-triangle",
      size: 14
    }))), /*#__PURE__*/React.createElement(Auth, {
      v: r.auth
    }), /*#__PURE__*/React.createElement("span", {
      className: "sg-tnum",
      style: {
        fontSize: 13,
        color: 'var(--sg-text-2)'
      }
    }, r.links), /*#__PURE__*/React.createElement("span", {
      className: "sg-tnum",
      style: {
        fontSize: 12.5,
        color: 'var(--sg-text-2)'
      }
    }, r.seen), /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement(TypePill, {
      t: r.type
    })), /*#__PURE__*/React.createElement("span", {
      style: {
        justifySelf: 'start'
      }
    }, /*#__PURE__*/React.createElement(StatusPill, {
      s: r.status
    })));
  }
  function Backlinks() {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        maxWidth: 1180,
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 20
      }
    }, /*#__PURE__*/React.createElement(PageHead, {
      eyebrow: "Research",
      title: "Backlinks",
      icon: "link",
      sub: "Links pointing to the4sale.com."
    }), /*#__PURE__*/React.createElement(StatRow, null), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: '1.6fr 1fr',
        gap: 20,
        alignItems: 'stretch'
      }
    }, /*#__PURE__*/React.createElement(NewLostTrend, null), /*#__PURE__*/React.createElement(ToxicCallout, null)), /*#__PURE__*/React.createElement(Card, null, /*#__PURE__*/React.createElement(CardHead, {
      title: "Referring domains",
      sub: "148 domains linking to you",
      right: /*#__PURE__*/React.createElement("button", {
        style: {
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 12.5,
          fontWeight: 600,
          color: 'var(--sg-text-2)',
          background: 'var(--sg-sunken)',
          border: '1px solid var(--sg-border)',
          borderRadius: 'var(--sg-radius-pill)',
          padding: '6px 12px',
          cursor: 'pointer'
        }
      }, /*#__PURE__*/React.createElement(Icon, {
        name: "download",
        size: 13
      }), " Export")
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: '1fr 80px 70px 110px 110px 90px',
        gap: 14,
        padding: '10px 20px',
        borderBottom: '1px solid var(--sg-border)',
        fontSize: 10.5,
        fontWeight: 700,
        letterSpacing: '0.05em',
        textTransform: 'uppercase',
        color: 'var(--sg-text-3)'
      }
    }, /*#__PURE__*/React.createElement("span", null, "Domain"), /*#__PURE__*/React.createElement("span", null, "Authority"), /*#__PURE__*/React.createElement("span", null, "Links"), /*#__PURE__*/React.createElement("span", null, "First seen"), /*#__PURE__*/React.createElement("span", null, "Type"), /*#__PURE__*/React.createElement("span", null, "Status")), DOMAINS.map((r, i) => /*#__PURE__*/React.createElement(DomainRow, {
      key: i,
      r: r,
      last: i === DOMAINS.length - 1
    }))));
  }
  window.SGBacklinks = Backlinks;
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/seo-geo/SGBacklinks.jsx", error: String((e && e.message) || e) }); }

// ui_kits/seo-geo/SGCompetitors.jsx
try { (() => {
// ABC SEO/GEO — Block 8: Competitors (SEO + GEO dual comparison).
(function () {
  const {
    Icon
  } = window.SGIcons;
  const {
    Card,
    CardHead,
    PageHead
  } = window.SGKit;
  const COMPS = [{
    domain: 'the4sale.com',
    you: true,
    color: 'var(--sg-blue-500)'
  }, {
    domain: 'realtor.ca',
    color: '#0A6ED1'
  }, {
    domain: 'zolo.ca',
    color: '#16A34A'
  }, {
    domain: 'housesigma.com',
    color: '#F59E0B'
  }];

  // metric rows: higher is better. value + whether you win/lose vs that competitor
  const ROWS = [{
    metric: 'SEO Visibility',
    fmt: v => v + '%',
    vals: {
      you: 41,
      'realtor.ca': 92,
      'zolo.ca': 68,
      'housesigma.com': 57
    }
  }, {
    metric: 'Organic keywords',
    fmt: v => v.toLocaleString(),
    vals: {
      you: 1284,
      'realtor.ca': 184000,
      'zolo.ca': 42500,
      'housesigma.com': 28900
    }
  }, {
    metric: 'Backlinks',
    fmt: v => v.toLocaleString(),
    vals: {
      you: 412,
      'realtor.ca': 2400000,
      'zolo.ca': 88000,
      'housesigma.com': 51000
    }
  }, {
    metric: 'AI Visibility score',
    ai: true,
    fmt: v => v + '/100',
    vals: {
      you: 64,
      'realtor.ca': 58,
      'zolo.ca': 49,
      'housesigma.com': 71
    }
  }, {
    metric: 'AI share of voice',
    ai: true,
    fmt: v => v + '%',
    vals: {
      you: 23,
      'realtor.ca': 19,
      'zolo.ca': 14,
      'housesigma.com': 31
    }
  }];
  function ComparisonTable() {
    const cols = COMPS.map(c => c.domain);
    const youKey = 'you';
    return /*#__PURE__*/React.createElement(Card, {
      style: {
        overflow: 'hidden'
      }
    }, /*#__PURE__*/React.createElement(CardHead, {
      title: "Head-to-head",
      sub: "Green = you win \xB7 red = competitor leads \xB7 \u2726 rows are AI/GEO"
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: '180px repeat(4, 1fr)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        padding: '12px 18px',
        borderBottom: '1px solid var(--sg-border)',
        fontSize: 10.5,
        fontWeight: 700,
        letterSpacing: '0.05em',
        textTransform: 'uppercase',
        color: 'var(--sg-text-3)'
      }
    }, "Metric"), COMPS.map(c => /*#__PURE__*/React.createElement("div", {
      key: c.domain,
      style: {
        padding: '12px 14px',
        borderBottom: '1px solid var(--sg-border)',
        borderLeft: '1px solid var(--sg-border)',
        background: c.you ? 'var(--sg-blue-50)' : 'transparent',
        display: 'flex',
        alignItems: 'center',
        gap: 8
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: 9,
        height: 9,
        borderRadius: 3,
        background: c.color,
        flex: 'none'
      }
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 12.5,
        fontWeight: 700,
        color: c.you ? 'var(--sg-blue-700)' : 'var(--sg-text)',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap'
      }
    }, c.domain), c.you && /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 9.5,
        fontWeight: 700,
        color: 'var(--sg-blue-700)',
        background: 'var(--sg-card)',
        padding: '1px 6px',
        borderRadius: 'var(--sg-radius-pill)'
      }
    }, "YOU"))), ROWS.map((r, ri) => {
      const youVal = r.vals[youKey];
      return /*#__PURE__*/React.createElement(React.Fragment, {
        key: r.metric
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          padding: '14px 18px',
          borderBottom: ri < ROWS.length - 1 ? '1px solid var(--sg-border)' : 'none',
          display: 'flex',
          alignItems: 'center',
          gap: 7
        }
      }, r.ai && /*#__PURE__*/React.createElement(Icon, {
        name: "sparkles",
        size: 14,
        color: "var(--sg-violet-600)"
      }), /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 13,
          fontWeight: 600,
          color: 'var(--sg-text)'
        }
      }, r.metric)), COMPS.map(c => {
        const key = c.you ? youKey : c.domain;
        const v = r.vals[key];
        let color = 'var(--sg-text)';
        if (!c.you) {
          color = youVal >= v ? 'var(--sg-green)' : 'var(--sg-red)';
        }
        return /*#__PURE__*/React.createElement("div", {
          key: c.domain,
          style: {
            padding: '14px',
            borderLeft: '1px solid var(--sg-border)',
            borderBottom: ri < ROWS.length - 1 ? '1px solid var(--sg-border)' : 'none',
            background: c.you ? 'var(--sg-blue-50)' : 'transparent'
          }
        }, /*#__PURE__*/React.createElement("span", {
          className: "sg-tnum",
          style: {
            fontFamily: 'var(--sg-font-display)',
            fontWeight: 700,
            fontSize: 15,
            color: c.you ? r.ai ? 'var(--sg-violet-700)' : 'var(--sg-blue-700)' : color
          }
        }, r.fmt(v)));
      }));
    })));
  }

  // AI share-of-voice donut
  const SOV = [{
    name: 'housesigma.com',
    v: 31,
    color: '#F59E0B'
  }, {
    name: 'the4sale.com',
    v: 23,
    color: 'var(--sg-violet-600)',
    you: true
  }, {
    name: 'realtor.ca',
    v: 19,
    color: '#0A6ED1'
  }, {
    name: 'zolo.ca',
    v: 14,
    color: '#16A34A'
  }, {
    name: 'Others',
    v: 13,
    color: 'var(--sg-border-2)'
  }];
  function Donut() {
    const total = SOV.reduce((a, s) => a + s.v, 0);
    const R = 64,
      C = 2 * Math.PI * R;
    let acc = 0;
    return /*#__PURE__*/React.createElement(Card, null, /*#__PURE__*/React.createElement(CardHead, {
      ai: true,
      title: "AI share of voice",
      sub: "Who AI engines cite for property questions"
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 22,
        padding: 20,
        flexWrap: 'wrap'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'relative',
        width: 160,
        height: 160,
        flex: 'none'
      }
    }, /*#__PURE__*/React.createElement("svg", {
      width: "160",
      height: "160",
      style: {
        transform: 'rotate(-90deg)'
      }
    }, SOV.map(s => {
      const len = s.v / total * C;
      const seg = /*#__PURE__*/React.createElement("circle", {
        key: s.name,
        cx: "80",
        cy: "80",
        r: R,
        fill: "none",
        stroke: s.color,
        strokeWidth: s.you ? 22 : 18,
        strokeDasharray: `${len} ${C - len}`,
        strokeDashoffset: -acc
      });
      acc += len;
      return seg;
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        lineHeight: 1
      }
    }, /*#__PURE__*/React.createElement("span", {
      className: "sg-tnum",
      style: {
        fontFamily: 'var(--sg-font-display)',
        fontWeight: 700,
        fontSize: 26,
        color: 'var(--sg-violet-700)'
      }
    }, "23%"), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 11,
        color: 'var(--sg-text-3)',
        marginTop: 4
      }
    }, "you"))), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 180,
        display: 'flex',
        flexDirection: 'column',
        gap: 9
      }
    }, SOV.map(s => /*#__PURE__*/React.createElement("div", {
      key: s.name,
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 9
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: 11,
        height: 11,
        borderRadius: 3,
        background: s.color
      }
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1,
        fontSize: 13,
        fontWeight: s.you ? 700 : 500,
        color: s.you ? 'var(--sg-violet-700)' : 'var(--sg-text)'
      }
    }, s.name, s.you && ' (you)'), /*#__PURE__*/React.createElement("span", {
      className: "sg-tnum",
      style: {
        fontSize: 13,
        fontWeight: 700,
        color: 'var(--sg-text)'
      }
    }, s.v, "%"))))));
  }

  // keyword & prompt gaps
  const GAPS = [{
    q: 'where to buy distressed properties Toronto',
    kind: 'prompt',
    who: 'housesigma.com',
    vol: 'High intent'
  }, {
    q: 'best real estate platform canada',
    kind: 'keyword',
    who: 'realtor.ca',
    vol: '2,400/mo'
  }, {
    q: 'how to sell a house without a realtor',
    kind: 'prompt',
    who: 'zolo.ca',
    vol: 'High intent'
  }, {
    q: 'condo prices mississauga 2026',
    kind: 'keyword',
    who: 'housesigma.com',
    vol: '4,100/mo'
  }, {
    q: 'is now a good time to buy in the GTA',
    kind: 'prompt',
    who: 'realtor.ca',
    vol: 'Rising'
  }];
  function Gaps() {
    return /*#__PURE__*/React.createElement(Card, null, /*#__PURE__*/React.createElement(CardHead, {
      title: "Keyword & prompt gaps",
      sub: "Where competitors win and you're not present yet \u2014 your best targets",
      right: /*#__PURE__*/React.createElement("button", {
        style: {
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 12.5,
          fontWeight: 600,
          color: 'var(--sg-text-2)',
          background: 'var(--sg-sunken)',
          border: '1px solid var(--sg-border)',
          borderRadius: 'var(--sg-radius-pill)',
          padding: '6px 12px',
          cursor: 'pointer'
        }
      }, "All 46 gaps")
    }), GAPS.map((g, i) => {
      const isPrompt = g.kind === 'prompt';
      return /*#__PURE__*/React.createElement("div", {
        key: i,
        style: {
          display: 'grid',
          gridTemplateColumns: '1fr 130px 120px 92px',
          alignItems: 'center',
          gap: 14,
          padding: '13px 20px',
          borderBottom: i < GAPS.length - 1 ? '1px solid var(--sg-border)' : 'none'
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          minWidth: 0
        }
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          width: 26,
          height: 26,
          borderRadius: 7,
          flex: 'none',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: isPrompt ? 'var(--sg-violet-100)' : 'var(--sg-blue-50)',
          color: isPrompt ? 'var(--sg-violet-700)' : 'var(--sg-blue-600)'
        }
      }, /*#__PURE__*/React.createElement(Icon, {
        name: isPrompt ? 'sparkles' : 'key',
        size: 13
      })), /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 13.5,
          color: 'var(--sg-text)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }
      }, isPrompt ? `"${g.q}"` : g.q)), /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 12,
          color: 'var(--sg-text-2)'
        }
      }, "Won by ", /*#__PURE__*/React.createElement("strong", {
        style: {
          color: 'var(--sg-text)'
        }
      }, g.who)), /*#__PURE__*/React.createElement("span", {
        className: "sg-tnum",
        style: {
          fontSize: 12.5,
          color: 'var(--sg-text-2)'
        }
      }, g.vol), /*#__PURE__*/React.createElement("button", {
        style: {
          justifySelf: 'end',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          height: 30,
          padding: '0 13px',
          border: 'none',
          borderRadius: 'var(--sg-radius-pill)',
          cursor: 'pointer',
          fontFamily: 'var(--sg-font-sans)',
          fontWeight: 700,
          fontSize: 12.5,
          color: '#fff',
          background: isPrompt ? 'var(--sg-grad-violet)' : 'var(--sg-grad-brand)'
        }
      }, /*#__PURE__*/React.createElement(Icon, {
        name: "target",
        size: 13
      }), " Target"));
    }));
  }
  function Competitors() {
    const [sel, setSel] = React.useState('all');
    return /*#__PURE__*/React.createElement("div", {
      style: {
        maxWidth: 1180,
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 20
      }
    }, /*#__PURE__*/React.createElement(PageHead, {
      eyebrow: "Research",
      title: "Competitors",
      icon: "target",
      sub: "How you stack up in search AND in AI answers."
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 10,
        flexWrap: 'wrap'
      }
    }, COMPS.map(c => /*#__PURE__*/React.createElement("span", {
      key: c.domain,
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        height: 38,
        padding: '0 16px',
        borderRadius: 'var(--sg-radius-pill)',
        border: c.you ? '1px solid var(--sg-blue-500)' : '1px solid var(--sg-border)',
        background: c.you ? 'var(--sg-blue-50)' : 'var(--sg-card)',
        fontSize: 13,
        fontWeight: 600,
        color: c.you ? 'var(--sg-blue-700)' : 'var(--sg-text)',
        boxShadow: 'var(--sg-shadow)'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: 9,
        height: 9,
        borderRadius: 3,
        background: c.color
      }
    }), c.domain, c.you && ' (you)')), /*#__PURE__*/React.createElement("button", {
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        height: 38,
        padding: '0 14px',
        borderRadius: 'var(--sg-radius-pill)',
        border: '1px dashed var(--sg-border-2)',
        background: 'transparent',
        cursor: 'pointer',
        fontSize: 13,
        fontWeight: 600,
        color: 'var(--sg-text-2)'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "plus",
      size: 15
    }), " Add competitor")), /*#__PURE__*/React.createElement(ComparisonTable, null), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: '1fr 1.4fr',
        gap: 20,
        alignItems: 'start'
      }
    }, /*#__PURE__*/React.createElement(Donut, null), /*#__PURE__*/React.createElement(Gaps, null)));
  }
  window.SGCompetitors = Competitors;
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/seo-geo/SGCompetitors.jsx", error: String((e && e.message) || e) }); }

// ui_kits/seo-geo/SGDashboard.jsx
try { (() => {
// ABC SEO/GEO — Block 2: Overview Dashboard. SEO + GEO side by side.
(function () {
  const {
    Icon
  } = window.SGIcons;
  const {
    Card,
    CardHead,
    Delta,
    Gauge,
    Sparkline,
    Bar,
    PageHead,
    RangeBtn
  } = window.SGKit;

  /* dual hero score */
  function HeroScore({
    kind,
    value,
    color,
    grad,
    delta,
    title,
    desc
  }) {
    return /*#__PURE__*/React.createElement(Card, {
      style: {
        padding: 24,
        display: 'flex',
        alignItems: 'center',
        gap: 22,
        animation: 'sg-rise 0.4s var(--sg-ease) both'
      }
    }, /*#__PURE__*/React.createElement(Gauge, {
      value: value,
      color: color,
      size: 150,
      suffix: "/100"
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginBottom: 6
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: 26,
        height: 26,
        borderRadius: 8,
        background: grad,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: kind === 'geo' ? 'sparkles' : 'trending-up',
      size: 15,
      color: "#fff"
    })), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--sg-font-display)',
        fontWeight: 600,
        fontSize: 17,
        color: 'var(--sg-text)'
      }
    }, title)), /*#__PURE__*/React.createElement("p", {
      style: {
        margin: '0 0 14px',
        fontSize: 13,
        color: 'var(--sg-text-2)',
        lineHeight: 1.5
      }
    }, desc), /*#__PURE__*/React.createElement(Delta, {
      dir: "up"
    }, delta, " this month")));
  }

  /* metric stat card with sparkline */
  const STATS = [{
    label: 'Organic keywords',
    value: '1,284',
    icon: 'key',
    color: 'var(--sg-blue-500)',
    delta: '6%',
    dir: 'up',
    spark: [40, 44, 43, 48, 52, 55, 58, 62]
  }, {
    label: 'Monthly traffic',
    value: '8,430',
    icon: 'trending-up',
    color: 'var(--sg-blue-500)',
    delta: '3%',
    dir: 'up',
    spark: [60, 58, 62, 61, 64, 63, 66, 68]
  }, {
    label: 'Backlinks',
    value: '412',
    icon: 'link',
    color: 'var(--sg-blue-500)',
    delta: '12',
    dir: 'up',
    spark: [30, 33, 35, 34, 38, 40, 44, 47]
  }, {
    label: 'AI mentions',
    value: '37',
    icon: 'sparkles',
    color: 'var(--sg-violet-600)',
    delta: '9',
    dir: 'up',
    spark: [12, 15, 14, 18, 22, 28, 31, 37],
    ai: true
  }];
  function StatCard({
    s
  }) {
    return /*#__PURE__*/React.createElement(Card, {
      style: {
        padding: 18
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 9,
        marginBottom: 14
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: 30,
        height: 30,
        borderRadius: 9,
        background: s.ai ? 'var(--sg-violet-50)' : 'var(--sg-blue-50)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: s.icon,
      size: 16,
      color: s.color
    })), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 12.5,
        fontWeight: 600,
        color: 'var(--sg-text-2)'
      }
    }, s.label)), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        gap: 10
      }
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      className: "sg-tnum",
      style: {
        fontFamily: 'var(--sg-font-display)',
        fontWeight: 700,
        fontSize: 30,
        letterSpacing: '-0.02em',
        color: 'var(--sg-text)',
        lineHeight: 1
      }
    }, s.value), /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 10
      }
    }, /*#__PURE__*/React.createElement(Delta, {
      dir: s.dir
    }, s.delta))), /*#__PURE__*/React.createElement(Sparkline, {
      data: s.spark,
      color: s.color,
      w: 84,
      h: 36
    })));
  }

  /* dual-line visibility trend */
  function DualTrend() {
    const seo = [62, 63, 62, 64, 65, 64, 66, 67, 66, 68, 69, 70, 71, 72, 78];
    const geo = [44, 46, 45, 48, 50, 49, 52, 54, 53, 56, 58, 57, 60, 62, 64];
    const W = 620,
      H = 210,
      pad = 14;
    const x = i => pad + i * (W - pad * 2) / (seo.length - 1);
    const y = v => H - pad - (v - 38) / (84 - 38) * (H - pad * 2);
    const path = arr => arr.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
    return /*#__PURE__*/React.createElement(Card, null, /*#__PURE__*/React.createElement(CardHead, {
      title: "Visibility trend",
      sub: "SEO rankings and AI visibility, last 30 days",
      right: /*#__PURE__*/React.createElement("div", {
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: 16
        }
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 12.5,
          fontWeight: 600,
          color: 'var(--sg-text-2)'
        }
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          width: 12,
          height: 3,
          borderRadius: 2,
          background: 'var(--sg-blue-500)'
        }
      }), " SEO"), /*#__PURE__*/React.createElement("span", {
        style: {
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 12.5,
          fontWeight: 600,
          color: 'var(--sg-text-2)'
        }
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          width: 12,
          height: 3,
          borderRadius: 2,
          background: 'var(--sg-violet-600)'
        }
      }), " GEO"))
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        padding: '12px 16px 4px'
      }
    }, /*#__PURE__*/React.createElement("svg", {
      viewBox: `0 0 ${W} ${H}`,
      width: "100%",
      height: "210",
      preserveAspectRatio: "none",
      style: {
        display: 'block'
      }
    }, /*#__PURE__*/React.createElement("defs", null, /*#__PURE__*/React.createElement("linearGradient", {
      id: "sgSeoA",
      x1: "0",
      y1: "0",
      x2: "0",
      y2: "1"
    }, /*#__PURE__*/React.createElement("stop", {
      offset: "0%",
      stopColor: "#2563EB",
      stopOpacity: "0.16"
    }), /*#__PURE__*/React.createElement("stop", {
      offset: "100%",
      stopColor: "#2563EB",
      stopOpacity: "0"
    })), /*#__PURE__*/React.createElement("linearGradient", {
      id: "sgGeoA",
      x1: "0",
      y1: "0",
      x2: "0",
      y2: "1"
    }, /*#__PURE__*/React.createElement("stop", {
      offset: "0%",
      stopColor: "#7C3AED",
      stopOpacity: "0.16"
    }), /*#__PURE__*/React.createElement("stop", {
      offset: "100%",
      stopColor: "#7C3AED",
      stopOpacity: "0"
    }))), [0, 1, 2, 3].map(g => /*#__PURE__*/React.createElement("line", {
      key: g,
      x1: pad,
      x2: W - pad,
      y1: pad + g * (H - pad * 2) / 3,
      y2: pad + g * (H - pad * 2) / 3,
      stroke: "var(--sg-border)",
      strokeWidth: "1",
      strokeDasharray: "3 4"
    })), /*#__PURE__*/React.createElement("path", {
      d: `${path(seo)} L${x(seo.length - 1)},${H - pad} L${x(0)},${H - pad} Z`,
      fill: "url(#sgSeoA)"
    }), /*#__PURE__*/React.createElement("path", {
      d: `${path(geo)} L${x(geo.length - 1)},${H - pad} L${x(0)},${H - pad} Z`,
      fill: "url(#sgGeoA)"
    }), /*#__PURE__*/React.createElement("path", {
      d: path(seo),
      fill: "none",
      stroke: "var(--sg-blue-500)",
      strokeWidth: "2.5",
      strokeLinejoin: "round",
      strokeLinecap: "round"
    }), /*#__PURE__*/React.createElement("path", {
      d: path(geo),
      fill: "none",
      stroke: "var(--sg-violet-600)",
      strokeWidth: "2.5",
      strokeLinejoin: "round",
      strokeLinecap: "round"
    }), /*#__PURE__*/React.createElement("circle", {
      cx: x(seo.length - 1),
      cy: y(seo[seo.length - 1]),
      r: "4.5",
      fill: "var(--sg-blue-500)",
      stroke: "#fff",
      strokeWidth: "2.5"
    }), /*#__PURE__*/React.createElement("circle", {
      cx: x(geo.length - 1),
      cy: y(geo[geo.length - 1]),
      r: "4.5",
      fill: "var(--sg-violet-600)",
      stroke: "#fff",
      strokeWidth: "2.5"
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        justifyContent: 'space-between',
        padding: '4px 14px 10px',
        fontSize: 11,
        color: 'var(--sg-text-3)'
      }
    }, /*#__PURE__*/React.createElement("span", null, "30d ago"), /*#__PURE__*/React.createElement("span", null, "20d"), /*#__PURE__*/React.createElement("span", null, "10d"), /*#__PURE__*/React.createElement("span", null, "Today"))));
  }

  /* AI engine visibility panel */
  const ENGINES = [{
    name: 'ChatGPT',
    tag: 'C',
    color: '#10A37F',
    share: 71,
    count: 540
  }, {
    name: 'Perplexity',
    tag: 'P',
    color: '#20808D',
    share: 58,
    count: 286
  }, {
    name: 'Google AI Overviews',
    tag: 'G',
    color: '#4285F4',
    share: 49,
    count: 244
  }, {
    name: 'Gemini',
    tag: 'G',
    color: '#8E75F0',
    share: 44,
    count: 132
  }, {
    name: 'Copilot',
    tag: 'C',
    color: '#0A6ED1',
    share: 38,
    count: 82
  }];
  function EnginePanel() {
    return /*#__PURE__*/React.createElement(Card, null, /*#__PURE__*/React.createElement(CardHead, {
      ai: true,
      title: "AI engine visibility",
      sub: "Mention share across answer engines"
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        padding: '6px 20px 14px'
      }
    }, ENGINES.map((e, i) => /*#__PURE__*/React.createElement("div", {
      key: e.name,
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '11px 0',
        borderBottom: i < ENGINES.length - 1 ? '1px solid var(--sg-border)' : 'none'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: 28,
        height: 28,
        borderRadius: 8,
        background: e.color,
        flex: 'none',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
        fontWeight: 700,
        fontSize: 13,
        fontFamily: 'var(--sg-font-display)'
      }
    }, e.tag), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: 6
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 13,
        fontWeight: 600,
        color: 'var(--sg-text)',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap'
      }
    }, e.name), /*#__PURE__*/React.createElement("span", {
      className: "sg-tnum",
      style: {
        fontSize: 12.5,
        fontWeight: 700,
        color: 'var(--sg-violet-700)'
      }
    }, e.count)), /*#__PURE__*/React.createElement(Bar, {
      pct: e.share,
      delay: 0.1 + i * 0.06
    }))))));
  }

  /* what to fix first */
  const FIXES = [{
    pr: 'var(--sg-red)',
    t: 'Speed up your biggest landing page',
    b: 'It loads in 3.8s — slow pages lose rankings and buyers.',
    tag: 'HIGH · SEO',
    tagc: 'var(--sg-blue-600)',
    tagbg: 'var(--sg-blue-50)'
  }, {
    pr: 'var(--sg-violet-600)',
    t: 'Add an FAQ about foreclosure listings',
    b: "You're missing from 3 high-intent prompts in ChatGPT.",
    tag: 'HIGH · GEO',
    tagc: 'var(--sg-violet-700)',
    tagbg: 'var(--sg-violet-100)'
  }, {
    pr: 'var(--sg-amber)',
    t: 'Write meta descriptions for 12 pages',
    b: 'Better summaries lift click-through from Google results.',
    tag: 'MED · SEO',
    tagc: 'var(--sg-blue-600)',
    tagbg: 'var(--sg-blue-50)'
  }, {
    pr: 'var(--sg-violet-600)',
    t: 'Collect 5 more cited customer reviews',
    b: 'Trust signals AI engines read before recommending you.',
    tag: 'MED · GEO',
    tagc: 'var(--sg-violet-700)',
    tagbg: 'var(--sg-violet-100)'
  }];
  function FixRow({
    f,
    i
  }) {
    const [h, setH] = React.useState(false);
    return /*#__PURE__*/React.createElement("div", {
      onMouseEnter: () => setH(true),
      onMouseLeave: () => setH(false),
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '15px 20px',
        borderBottom: i < FIXES.length - 1 ? '1px solid var(--sg-border)' : 'none',
        background: h ? 'var(--sg-sunken)' : 'transparent',
        transition: 'background 140ms var(--sg-ease)'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: 9,
        height: 9,
        borderRadius: '50%',
        background: f.pr,
        flex: 'none'
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 14,
        fontWeight: 600,
        color: 'var(--sg-text)'
      }
    }, f.t), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12.5,
        color: 'var(--sg-text-2)',
        marginTop: 2
      }
    }, f.b)), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '0.04em',
        color: f.tagc,
        background: f.tagbg,
        padding: '4px 9px',
        borderRadius: 'var(--sg-radius-pill)',
        flex: 'none'
      }
    }, f.tag), /*#__PURE__*/React.createElement("button", {
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        fontSize: 13,
        fontWeight: 700,
        color: 'var(--sg-blue-600)',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        flex: 'none'
      }
    }, "Fix ", /*#__PURE__*/React.createElement(Icon, {
      name: "arrow-right",
      size: 15
    })));
  }
  function Dashboard() {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        maxWidth: 1180,
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 20
      }
    }, /*#__PURE__*/React.createElement(PageHead, {
      eyebrow: "Overview",
      title: "Overview",
      sub: "Your complete SEO + AI-visibility snapshot for the4sale.com.",
      right: /*#__PURE__*/React.createElement(RangeBtn, null)
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 16
      }
    }, /*#__PURE__*/React.createElement(HeroScore, {
      kind: "seo",
      value: 78,
      color: "var(--sg-blue-500)",
      grad: "var(--sg-grad-brand)",
      delta: "+4",
      title: "SEO Health Score",
      desc: "Your site is in good shape for Google. A few fixes will push you into the top tier."
    }), /*#__PURE__*/React.createElement(HeroScore, {
      kind: "geo",
      value: 64,
      color: "var(--sg-violet-600)",
      grad: "var(--sg-grad-violet)",
      delta: "+9",
      title: "GEO AI-Visibility Score",
      desc: "AI assistants are starting to recommend you. Keep feeding them clear, citable answers."
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 16
      }
    }, STATS.map(s => /*#__PURE__*/React.createElement(StatCard, {
      key: s.label,
      s: s
    }))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: '1.55fr 1fr',
        gap: 20,
        alignItems: 'start'
      }
    }, /*#__PURE__*/React.createElement(DualTrend, null), /*#__PURE__*/React.createElement(EnginePanel, null)), /*#__PURE__*/React.createElement(Card, null, /*#__PURE__*/React.createElement(CardHead, {
      title: "What to fix first",
      sub: "Prioritized across SEO and AI visibility \u2014 biggest wins on top",
      right: /*#__PURE__*/React.createElement("button", {
        style: {
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 12.5,
          fontWeight: 600,
          color: 'var(--sg-text-2)',
          background: 'var(--sg-sunken)',
          border: '1px solid var(--sg-border)',
          borderRadius: 'var(--sg-radius-pill)',
          padding: '6px 12px',
          cursor: 'pointer'
        }
      }, "View all 18")
    }), /*#__PURE__*/React.createElement("div", null, FIXES.map((f, i) => /*#__PURE__*/React.createElement(FixRow, {
      key: i,
      f: f,
      i: i
    })))));
  }
  window.SGDashboard = Dashboard;
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/seo-geo/SGDashboard.jsx", error: String((e && e.message) || e) }); }

// ui_kits/seo-geo/SGKeywords.jsx
try { (() => {
// ABC SEO/GEO — Block 4: Keywords / Rank Tracking.
(function () {
  const {
    Icon
  } = window.SGIcons;
  const {
    Card,
    CardHead,
    Delta,
    Sparkline,
    PageHead
  } = window.SGKit;

  /* summary stats */
  const SUMMARY = [{
    label: 'Tracked keywords',
    value: '240'
  }, {
    label: 'Top 3 positions',
    value: '28',
    accent: 'var(--sg-green)'
  }, {
    label: 'Top 10',
    value: '64'
  }, {
    label: 'Avg. position',
    value: '14.2',
    delta: '1.3',
    dir: 'up'
  }, {
    label: 'Est. traffic value',
    value: '$3,180',
    mono: true
  }];
  function SummaryRow() {
    return /*#__PURE__*/React.createElement(Card, {
      style: {
        display: 'grid',
        gridTemplateColumns: 'repeat(5, 1fr)',
        overflow: 'hidden'
      }
    }, SUMMARY.map((s, i) => /*#__PURE__*/React.createElement("div", {
      key: s.label,
      style: {
        padding: '18px 20px',
        borderLeft: i ? '1px solid var(--sg-border)' : 'none'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        fontWeight: 600,
        color: 'var(--sg-text-2)',
        marginBottom: 8
      }
    }, s.label), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 8
      }
    }, /*#__PURE__*/React.createElement("span", {
      className: "sg-tnum",
      style: {
        fontFamily: 'var(--sg-font-display)',
        fontWeight: 700,
        fontSize: 26,
        letterSpacing: '-0.02em',
        color: s.accent || 'var(--sg-text)',
        lineHeight: 1
      }
    }, s.value), s.delta && /*#__PURE__*/React.createElement(Delta, {
      dir: s.dir
    }, s.delta)))));
  }

  /* position distribution stacked bar */
  const DIST = [{
    label: '1–3',
    n: 28,
    color: 'var(--sg-green)'
  }, {
    label: '4–10',
    n: 36,
    color: 'var(--sg-blue-500)'
  }, {
    label: '11–20',
    n: 62,
    color: 'var(--sg-blue-300, #7C84D6)'
  }, {
    label: '21–50',
    n: 78,
    color: 'var(--sg-amber)'
  }, {
    label: '50+',
    n: 36,
    color: 'var(--sg-text-3)'
  }];
  function Distribution() {
    const total = DIST.reduce((a, d) => a + d.n, 0);
    return /*#__PURE__*/React.createElement(Card, null, /*#__PURE__*/React.createElement(CardHead, {
      title: "Position distribution",
      sub: "Where your 240 keywords rank on Google"
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        padding: 20
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        height: 16,
        borderRadius: 999,
        overflow: 'hidden',
        background: 'var(--sg-sunken)'
      }
    }, DIST.map((d, i) => /*#__PURE__*/React.createElement("div", {
      key: d.label,
      title: `${d.label}: ${d.n}`,
      style: {
        width: d.n / total * 100 + '%',
        background: d.color,
        transformOrigin: 'left',
        animation: 'sg-grow 0.6s var(--sg-ease) both',
        animationDelay: i * 0.08 + 's'
      }
    }))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '10px 22px',
        marginTop: 16
      }
    }, DIST.map(d => /*#__PURE__*/React.createElement("div", {
      key: d.label,
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 8
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: 11,
        height: 11,
        borderRadius: 3,
        background: d.color
      }
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 12.5,
        color: 'var(--sg-text-2)'
      }
    }, "Pos ", d.label), /*#__PURE__*/React.createElement("span", {
      className: "sg-tnum",
      style: {
        fontSize: 12.5,
        fontWeight: 700,
        color: 'var(--sg-text)'
      }
    }, d.n))))));
  }

  /* keyword difficulty chip */
  function KD({
    v
  }) {
    const c = v >= 70 ? 'var(--sg-red)' : v >= 40 ? 'var(--sg-amber)' : 'var(--sg-green)';
    const bg = v >= 70 ? 'var(--sg-red-50)' : v >= 40 ? 'var(--sg-amber-50)' : 'var(--sg-green-50)';
    return /*#__PURE__*/React.createElement("span", {
      className: "sg-tnum",
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 34,
        height: 24,
        padding: '0 8px',
        fontSize: 12.5,
        fontWeight: 700,
        color: c,
        background: bg,
        borderRadius: 'var(--sg-radius-sm)'
      }
    }, v);
  }
  /* SERP feature icons */
  function Serp({
    features
  }) {
    const map = {
      ai: {
        icon: 'sparkles',
        c: 'var(--sg-violet-600)',
        bg: 'var(--sg-violet-100)',
        title: 'AI Overview'
      },
      map: {
        icon: 'target',
        c: 'var(--sg-blue-600)',
        bg: 'var(--sg-blue-50)',
        title: 'Map Pack'
      },
      snippet: {
        icon: 'file-text',
        c: 'var(--sg-text-2)',
        bg: 'var(--sg-sunken)',
        title: 'Featured Snippet'
      }
    };
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 5
      }
    }, features.map(f => {
      const m = map[f];
      return /*#__PURE__*/React.createElement("span", {
        key: f,
        title: m.title,
        style: {
          width: 24,
          height: 24,
          borderRadius: 6,
          background: m.bg,
          color: m.c,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center'
        }
      }, /*#__PURE__*/React.createElement(Icon, {
        name: m.icon,
        size: 13,
        strokeWidth: 2.2
      }));
    }));
  }
  const KEYWORDS = [{
    kw: 'real estate deals toronto',
    pos: 3,
    d: 2,
    dir: 'up',
    vol: '8,100',
    kd: 64,
    cpc: '$3.40',
    serp: ['ai', 'map'],
    spark: [9, 8, 7, 6, 5, 4, 3],
    ai: true
  }, {
    kw: 'foreclosure listings ontario',
    pos: 7,
    d: 1,
    dir: 'down',
    vol: '5,400',
    kd: 71,
    cpc: '$2.90',
    serp: ['ai', 'snippet'],
    spark: [5, 5, 6, 6, 7, 6, 7],
    ai: true
  }, {
    kw: 'buy distressed property canada',
    pos: 12,
    d: 4,
    dir: 'up',
    vol: '2,200',
    kd: 48,
    cpc: '$4.10',
    serp: ['snippet'],
    spark: [18, 16, 15, 14, 13, 13, 12]
  }, {
    kw: 'the4sale reviews',
    pos: 1,
    d: 0,
    dir: 'flat',
    vol: '1,300',
    kd: 12,
    cpc: '$0.80',
    serp: ['ai'],
    spark: [1, 1, 1, 1, 1, 1, 1],
    ai: true
  }, {
    kw: 'property investment platform',
    pos: 18,
    d: 3,
    dir: 'up',
    vol: '3,600',
    kd: 58,
    cpc: '$5.20',
    serp: ['map', 'snippet'],
    spark: [24, 23, 22, 21, 20, 19, 18]
  }, {
    kw: 'homes for sale gta under market',
    pos: 24,
    d: 2,
    dir: 'down',
    vol: '4,800',
    kd: 66,
    cpc: '$3.10',
    serp: ['ai', 'map'],
    spark: [20, 21, 21, 22, 23, 23, 24],
    ai: true
  }];
  function KwRow({
    r,
    last
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: '1fr 96px 96px 64px 78px 92px 90px',
        alignItems: 'center',
        gap: 12,
        padding: '13px 20px',
        borderBottom: last ? 'none' : '1px solid var(--sg-border)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 9,
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 13.5,
        fontWeight: 500,
        color: 'var(--sg-text)',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap'
      }
    }, r.kw), r.ai && /*#__PURE__*/React.createElement("span", {
      title: "Appears in AI Overviews",
      style: {
        flex: 'none',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 3,
        fontSize: 9.5,
        fontWeight: 700,
        color: 'var(--sg-violet-700)',
        background: 'var(--sg-violet-100)',
        padding: '2px 6px',
        borderRadius: 'var(--sg-radius-pill)'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "sparkles",
      size: 10
    }), " AI")), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 7
      }
    }, /*#__PURE__*/React.createElement("span", {
      className: "sg-tnum",
      style: {
        fontFamily: 'var(--sg-font-display)',
        fontWeight: 700,
        fontSize: 15,
        color: 'var(--sg-text)'
      }
    }, r.pos), r.dir !== 'flat' ? /*#__PURE__*/React.createElement("span", {
      className: "sg-tnum",
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 1,
        fontSize: 11.5,
        fontWeight: 700,
        color: r.dir === 'up' ? 'var(--sg-green)' : 'var(--sg-red)'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: r.dir === 'up' ? 'arrow-up' : 'arrow-down',
      size: 11,
      strokeWidth: 2.8
    }), r.d) : /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 11.5,
        color: 'var(--sg-text-3)'
      }
    }, "\u2014")), /*#__PURE__*/React.createElement("span", {
      className: "sg-tnum",
      style: {
        fontSize: 13,
        color: 'var(--sg-text-2)'
      }
    }, r.vol), /*#__PURE__*/React.createElement(KD, {
      v: r.kd
    }), /*#__PURE__*/React.createElement("span", {
      className: "sg-tnum",
      style: {
        fontSize: 13,
        color: 'var(--sg-text-2)'
      }
    }, r.cpc), /*#__PURE__*/React.createElement(Serp, {
      features: r.serp
    }), /*#__PURE__*/React.createElement(Sparkline, {
      data: r.spark.map(v => -v),
      color: r.dir === 'down' ? 'var(--sg-red)' : 'var(--sg-green)',
      w: 80,
      h: 26
    }));
  }

  /* keyword ideas */
  const IDEAS = [{
    kw: 'pre-construction condos toronto',
    vol: '6,600',
    kd: 52
  }, {
    kw: 'how to sell house fast ontario',
    vol: '3,900',
    kd: 41
  }, {
    kw: 'best real estate platform canada',
    vol: '2,400',
    kd: 47
  }, {
    kw: 'rent to own homes gta',
    vol: '5,100',
    kd: 55
  }];
  function Ideas() {
    return /*#__PURE__*/React.createElement(Card, null, /*#__PURE__*/React.createElement(CardHead, {
      ai: true,
      title: "Keyword ideas",
      sub: "Untapped searches you could rank for"
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        padding: '6px 12px 14px'
      }
    }, IDEAS.map((k, i) => {
      return /*#__PURE__*/React.createElement("div", {
        key: i,
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '11px 8px',
          borderBottom: i < IDEAS.length - 1 ? '1px solid var(--sg-border)' : 'none'
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          flex: 1,
          minWidth: 0
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 13,
          fontWeight: 500,
          color: 'var(--sg-text)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }
      }, k.kw), /*#__PURE__*/React.createElement("div", {
        className: "sg-tnum",
        style: {
          fontSize: 11.5,
          color: 'var(--sg-text-3)',
          marginTop: 2
        }
      }, k.vol, " / mo \xB7 KD ", k.kd)), /*#__PURE__*/React.createElement("button", {
        "aria-label": "Add",
        style: {
          width: 28,
          height: 28,
          flex: 'none',
          borderRadius: 8,
          border: '1px solid var(--sg-border)',
          background: 'var(--sg-card)',
          cursor: 'pointer',
          color: 'var(--sg-blue-600)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center'
        }
      }, /*#__PURE__*/React.createElement(Icon, {
        name: "plus",
        size: 15
      })));
    })));
  }
  function Keywords() {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        maxWidth: 1180,
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 20
      }
    }, /*#__PURE__*/React.createElement(PageHead, {
      eyebrow: "Research",
      title: "Keywords",
      icon: "key",
      sub: "Track your Google rankings and spot the SEO \u2194 AI crossover.",
      right: /*#__PURE__*/React.createElement("div", {
        style: {
          display: 'inline-flex',
          background: 'var(--sg-sunken)',
          border: '1px solid var(--sg-border)',
          borderRadius: 'var(--sg-radius-pill)',
          padding: 3
        }
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          height: 36,
          padding: '0 14px',
          fontSize: 13,
          fontWeight: 600,
          color: 'var(--sg-text)',
          background: 'var(--sg-card)',
          borderRadius: 'var(--sg-radius-pill)',
          boxShadow: 'var(--sg-shadow)'
        }
      }, /*#__PURE__*/React.createElement(Icon, {
        name: "globe",
        size: 15,
        color: "var(--sg-text-2)"
      }), " Canada"), /*#__PURE__*/React.createElement("span", {
        style: {
          display: 'inline-flex',
          alignItems: 'center',
          height: 36,
          padding: '0 14px',
          fontSize: 13,
          fontWeight: 600,
          color: 'var(--sg-text-2)'
        }
      }, "Mobile"))
    }), /*#__PURE__*/React.createElement(Card, {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: 12
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        height: 44,
        padding: '0 14px',
        background: 'var(--sg-sunken)',
        border: '1px solid var(--sg-border)',
        borderRadius: 'var(--sg-radius-pill)'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "search",
      size: 18,
      color: "var(--sg-text-3)"
    }), /*#__PURE__*/React.createElement("input", {
      placeholder: "Enter a keyword or domain\u2026",
      style: {
        flex: 1,
        border: 'none',
        outline: 'none',
        background: 'transparent',
        fontFamily: 'var(--sg-font-sans)',
        fontSize: 14,
        color: 'var(--sg-text)'
      }
    })), /*#__PURE__*/React.createElement("button", {
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        height: 44,
        padding: '0 20px',
        border: 'none',
        borderRadius: 'var(--sg-radius-pill)',
        cursor: 'pointer',
        fontFamily: 'var(--sg-font-sans)',
        fontWeight: 700,
        fontSize: 14,
        color: '#fff',
        background: 'var(--sg-grad-brand)',
        boxShadow: '0 3px 10px rgba(37,99,235,0.26)'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "plus",
      size: 16
    }), " Add keywords")), /*#__PURE__*/React.createElement(SummaryRow, null), /*#__PURE__*/React.createElement(Distribution, null), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: '1.55fr 1fr',
        gap: 20,
        alignItems: 'start'
      }
    }, /*#__PURE__*/React.createElement(Card, null, /*#__PURE__*/React.createElement(CardHead, {
      title: "Tracked keywords",
      sub: "Violet AI badge = you also appear in AI Overviews"
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: '1fr 96px 96px 64px 78px 92px 90px',
        gap: 12,
        padding: '10px 20px',
        borderBottom: '1px solid var(--sg-border)',
        fontSize: 10.5,
        fontWeight: 700,
        letterSpacing: '0.05em',
        textTransform: 'uppercase',
        color: 'var(--sg-text-3)'
      }
    }, /*#__PURE__*/React.createElement("span", null, "Keyword"), /*#__PURE__*/React.createElement("span", null, "Position"), /*#__PURE__*/React.createElement("span", null, "Volume"), /*#__PURE__*/React.createElement("span", null, "KD"), /*#__PURE__*/React.createElement("span", null, "CPC"), /*#__PURE__*/React.createElement("span", null, "SERP"), /*#__PURE__*/React.createElement("span", null, "Trend")), KEYWORDS.map((r, i) => /*#__PURE__*/React.createElement(KwRow, {
      key: i,
      r: r,
      last: i === KEYWORDS.length - 1
    }))), /*#__PURE__*/React.createElement(Ideas, null)));
  }
  window.SGKeywords = Keywords;
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/seo-geo/SGKeywords.jsx", error: String((e && e.message) || e) }); }

// ui_kits/seo-geo/SGRankTracking.jsx
try { (() => {
// ABC SEO/GEO — Block 7: Rank Tracking (populated with 90-day history).
(function () {
  const {
    Icon
  } = window.SGIcons;
  const {
    Card,
    CardHead,
    Delta,
    PageHead
  } = window.SGKit;
  const STATS = [{
    label: 'Tracked keywords',
    value: '240'
  }, {
    label: 'Improved',
    value: '38',
    delta: '38',
    dir: 'up',
    accent: 'var(--sg-green)'
  }, {
    label: 'Declined',
    value: '12',
    delta: '12',
    dir: 'down',
    accent: 'var(--sg-red)'
  }, {
    label: 'Avg. position',
    value: '14.2',
    delta: '1.3',
    dir: 'up'
  }, {
    label: 'Visibility %',
    value: '1.8%',
    delta: '0.2',
    dir: 'up'
  }];
  function StatRow() {
    return /*#__PURE__*/React.createElement(Card, {
      style: {
        display: 'grid',
        gridTemplateColumns: 'repeat(5,1fr)',
        overflow: 'hidden'
      }
    }, STATS.map((s, i) => /*#__PURE__*/React.createElement("div", {
      key: s.label,
      style: {
        padding: '18px 20px',
        borderLeft: i ? '1px solid var(--sg-border)' : 'none'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        fontWeight: 600,
        color: 'var(--sg-text-2)',
        marginBottom: 8
      }
    }, s.label), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 8
      }
    }, /*#__PURE__*/React.createElement("span", {
      className: "sg-tnum",
      style: {
        fontFamily: 'var(--sg-font-display)',
        fontWeight: 700,
        fontSize: 26,
        letterSpacing: '-0.02em',
        color: s.accent || 'var(--sg-text)',
        lineHeight: 1
      }
    }, s.value), s.delta && /*#__PURE__*/React.createElement(Delta, {
      dir: s.dir
    }, s.delta)))));
  }

  /* 90-day average-position trend (inverted: up = better) */
  function RankTrend() {
    // average position values (lower = better); chart inverted so improving trends upward
    const data = [19.8, 19.5, 19.6, 18.9, 18.4, 18.6, 17.9, 17.2, 17.5, 16.8, 16.9, 16.1, 15.7, 16.0, 15.2, 14.8, 15.1, 14.9, 14.4, 14.2];
    const W = 760,
      H = 240,
      padX = 16,
      padT = 22,
      padB = 28;
    const dmin = 13,
      dmax = 21; // position domain
    const x = i => padX + i * (W - padX * 2) / (data.length - 1);
    const y = v => padT + (v - dmin) / (dmax - dmin) * (H - padT - padB); // higher position number -> lower on chart
    const line = data.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
    const ann = 12; // annotation index — "Google core update"
    return /*#__PURE__*/React.createElement(Card, null, /*#__PURE__*/React.createElement(CardHead, {
      title: "Average position \u2014 90 days",
      sub: "Daily Google rank for the4sale.com \xB7 higher line = better positions",
      right: /*#__PURE__*/React.createElement(Delta, {
        dir: "up"
      }, "1.3")
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        padding: '14px 16px 4px',
        position: 'relative'
      }
    }, /*#__PURE__*/React.createElement("svg", {
      viewBox: `0 0 ${W} ${H}`,
      width: "100%",
      height: "240",
      preserveAspectRatio: "none",
      style: {
        display: 'block'
      }
    }, /*#__PURE__*/React.createElement("defs", null, /*#__PURE__*/React.createElement("linearGradient", {
      id: "sgRankA",
      x1: "0",
      y1: "0",
      x2: "0",
      y2: "1"
    }, /*#__PURE__*/React.createElement("stop", {
      offset: "0%",
      stopColor: "#2563EB",
      stopOpacity: "0.16"
    }), /*#__PURE__*/React.createElement("stop", {
      offset: "100%",
      stopColor: "#2563EB",
      stopOpacity: "0"
    }))), [0, 1, 2, 3].map(g => /*#__PURE__*/React.createElement("line", {
      key: g,
      x1: padX,
      x2: W - padX,
      y1: padT + g * (H - padT - padB) / 3,
      y2: padT + g * (H - padT - padB) / 3,
      stroke: "var(--sg-border)",
      strokeWidth: "1",
      strokeDasharray: "3 4"
    })), /*#__PURE__*/React.createElement("path", {
      d: `${line} L${x(data.length - 1)},${H - padB} L${x(0)},${H - padB} Z`,
      fill: "url(#sgRankA)"
    }), /*#__PURE__*/React.createElement("path", {
      d: line,
      fill: "none",
      stroke: "var(--sg-blue-500)",
      strokeWidth: "2.5",
      strokeLinejoin: "round",
      strokeLinecap: "round"
    }), /*#__PURE__*/React.createElement("line", {
      x1: x(ann),
      x2: x(ann),
      y1: padT,
      y2: H - padB,
      stroke: "var(--sg-violet-500)",
      strokeWidth: "1.5",
      strokeDasharray: "4 4",
      opacity: "0.6"
    }), /*#__PURE__*/React.createElement("circle", {
      cx: x(ann),
      cy: y(data[ann]),
      r: "5",
      fill: "var(--sg-violet-600)",
      stroke: "#fff",
      strokeWidth: "2.5"
    }), /*#__PURE__*/React.createElement("circle", {
      cx: x(data.length - 1),
      cy: y(data[data.length - 1]),
      r: "5",
      fill: "var(--sg-blue-500)",
      stroke: "#fff",
      strokeWidth: "2.5"
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        left: `calc(${ann / (data.length - 1) * 100}% - 10px)`,
        top: 18,
        display: 'flex',
        alignItems: 'center',
        gap: 5,
        fontSize: 11,
        fontWeight: 700,
        color: 'var(--sg-violet-700)',
        background: 'var(--sg-violet-50)',
        border: '1px solid var(--sg-violet-200)',
        borderRadius: 'var(--sg-radius-pill)',
        padding: '3px 9px',
        whiteSpace: 'nowrap',
        transform: 'translateX(-50%)'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "zap",
      size: 11
    }), " Google core update"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        justifyContent: 'space-between',
        padding: '2px 14px 10px',
        fontSize: 11,
        color: 'var(--sg-text-3)'
      }
    }, /*#__PURE__*/React.createElement("span", null, "90d ago"), /*#__PURE__*/React.createElement("span", null, "60d"), /*#__PURE__*/React.createElement("span", null, "30d"), /*#__PURE__*/React.createElement("span", null, "Today"))));
  }

  /* position history mini sparkline (inverted: lower pos -> higher line) */
  function PosSpark({
    data,
    dir
  }) {
    const w = 78,
      h = 26,
      min = Math.min(...data),
      max = Math.max(...data),
      span = max - min || 1;
    const x = i => i * w / (data.length - 1);
    const y = v => 3 + (v - min) / span * (h - 6); // higher position number lower on chart
    const line = data.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
    return /*#__PURE__*/React.createElement("svg", {
      width: w,
      height: h,
      viewBox: `0 0 ${w} ${h}`,
      style: {
        display: 'block'
      }
    }, /*#__PURE__*/React.createElement("path", {
      d: line,
      fill: "none",
      stroke: dir === 'down' ? 'var(--sg-red)' : 'var(--sg-green)',
      strokeWidth: "2",
      strokeLinecap: "round",
      strokeLinejoin: "round"
    }));
  }
  function Serp({
    features
  }) {
    const map = {
      ai: {
        icon: 'sparkles',
        c: 'var(--sg-violet-600)',
        bg: 'var(--sg-violet-100)'
      },
      map: {
        icon: 'target',
        c: 'var(--sg-blue-600)',
        bg: 'var(--sg-blue-50)'
      },
      snippet: {
        icon: 'file-text',
        c: 'var(--sg-text-2)',
        bg: 'var(--sg-sunken)'
      }
    };
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 5
      }
    }, features.map(f => /*#__PURE__*/React.createElement("span", {
      key: f,
      style: {
        width: 23,
        height: 23,
        borderRadius: 6,
        background: map[f].bg,
        color: map[f].c,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: map[f].icon,
      size: 12,
      strokeWidth: 2.2
    }))));
  }
  const ROWS = [{
    kw: 'real estate deals toronto',
    pos: 3,
    d: 2,
    dir: 'up',
    best: 2,
    worst: 9,
    vol: '8,100',
    serp: ['ai', 'map'],
    hist: [9, 8, 7, 6, 5, 4, 3],
    ai: true
  }, {
    kw: 'the4sale reviews',
    pos: 1,
    d: 0,
    dir: 'flat',
    best: 1,
    worst: 2,
    vol: '1,300',
    serp: ['ai'],
    hist: [2, 1, 1, 1, 1, 1, 1],
    ai: true
  }, {
    kw: 'foreclosure listings ontario',
    pos: 7,
    d: 1,
    dir: 'down',
    best: 5,
    worst: 8,
    vol: '5,400',
    serp: ['ai', 'snippet'],
    hist: [5, 5, 6, 6, 7, 6, 7],
    ai: true
  }, {
    kw: 'homes for sale gta',
    pos: 9,
    d: 3,
    dir: 'up',
    best: 9,
    worst: 15,
    vol: '12,000',
    serp: ['map'],
    hist: [15, 14, 13, 12, 11, 10, 9]
  }, {
    kw: 'buy distressed property canada',
    pos: 12,
    d: 4,
    dir: 'up',
    best: 12,
    worst: 18,
    vol: '2,200',
    serp: ['snippet'],
    hist: [18, 16, 15, 14, 13, 13, 12]
  }, {
    kw: 'property investment platform',
    pos: 18,
    d: 3,
    dir: 'up',
    best: 18,
    worst: 24,
    vol: '3,600',
    serp: ['map', 'snippet'],
    hist: [24, 23, 22, 21, 20, 19, 18]
  }, {
    kw: 'pre-construction condos toronto',
    pos: 21,
    d: 2,
    dir: 'down',
    best: 17,
    worst: 21,
    vol: '6,600',
    serp: ['ai', 'map'],
    hist: [17, 18, 18, 19, 20, 20, 21],
    ai: true
  }, {
    kw: 'rent to own homes gta',
    pos: 26,
    d: 5,
    dir: 'up',
    best: 26,
    worst: 34,
    vol: '5,100',
    serp: [],
    hist: [34, 32, 30, 29, 28, 27, 26]
  }, {
    kw: 'sell my house fast ontario',
    pos: 31,
    d: 1,
    dir: 'down',
    best: 28,
    worst: 31,
    vol: '3,900',
    serp: ['snippet'],
    hist: [28, 29, 29, 30, 30, 31, 31]
  }, {
    kw: 'luxury homes mississauga',
    pos: 44,
    d: 6,
    dir: 'up',
    best: 44,
    worst: 58,
    vol: '2,800',
    serp: ['map'],
    hist: [58, 55, 52, 49, 47, 45, 44]
  }];
  function RankRow({
    r,
    last
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: '1fr 110px 96px 96px 90px 90px',
        alignItems: 'center',
        gap: 12,
        padding: '13px 20px',
        borderBottom: last ? 'none' : '1px solid var(--sg-border)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 9,
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 13.5,
        fontWeight: 500,
        color: 'var(--sg-text)',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap'
      }
    }, r.kw), r.ai && /*#__PURE__*/React.createElement("span", {
      title: "Appears in AI Overviews",
      style: {
        flex: 'none',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 3,
        fontSize: 9.5,
        fontWeight: 700,
        color: 'var(--sg-violet-700)',
        background: 'var(--sg-violet-100)',
        padding: '2px 6px',
        borderRadius: 'var(--sg-radius-pill)'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "sparkles",
      size: 10
    }), " AI")), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 7
      }
    }, /*#__PURE__*/React.createElement("span", {
      className: "sg-tnum",
      style: {
        fontFamily: 'var(--sg-font-display)',
        fontWeight: 700,
        fontSize: 15,
        color: 'var(--sg-text)'
      }
    }, r.pos), r.dir !== 'flat' ? /*#__PURE__*/React.createElement("span", {
      className: "sg-tnum",
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 1,
        fontSize: 11.5,
        fontWeight: 700,
        color: r.dir === 'up' ? 'var(--sg-green)' : 'var(--sg-red)'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: r.dir === 'up' ? 'arrow-up' : 'arrow-down',
      size: 11,
      strokeWidth: 2.8
    }), r.d) : /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 11.5,
        color: 'var(--sg-text-3)'
      }
    }, "\u2014")), /*#__PURE__*/React.createElement(PosSpark, {
      data: r.hist,
      dir: r.dir
    }), /*#__PURE__*/React.createElement("span", {
      className: "sg-tnum",
      style: {
        fontSize: 12.5,
        color: 'var(--sg-text-2)'
      }
    }, r.best, " / ", r.worst), /*#__PURE__*/React.createElement("span", {
      className: "sg-tnum",
      style: {
        fontSize: 13,
        color: 'var(--sg-text-2)'
      }
    }, r.vol), /*#__PURE__*/React.createElement(Serp, {
      features: r.serp
    }));
  }
  function RankTracking() {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        maxWidth: 1180,
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 20
      }
    }, /*#__PURE__*/React.createElement(PageHead, {
      eyebrow: "Research",
      title: "Rank Tracking",
      icon: "list-ordered",
      sub: "Daily Google positions for the4sale.com \u2014 Canada.",
      right: /*#__PURE__*/React.createElement("div", {
        style: {
          display: 'inline-flex',
          background: 'var(--sg-sunken)',
          border: '1px solid var(--sg-border)',
          borderRadius: 'var(--sg-radius-pill)',
          padding: 3
        }
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          height: 36,
          padding: '0 14px',
          fontSize: 13,
          fontWeight: 600,
          color: 'var(--sg-text)',
          background: 'var(--sg-card)',
          borderRadius: 'var(--sg-radius-pill)',
          boxShadow: 'var(--sg-shadow)'
        }
      }, /*#__PURE__*/React.createElement(Icon, {
        name: "globe",
        size: 15,
        color: "var(--sg-text-2)"
      }), " Canada"), /*#__PURE__*/React.createElement("span", {
        style: {
          display: 'inline-flex',
          alignItems: 'center',
          height: 36,
          padding: '0 14px',
          fontSize: 13,
          fontWeight: 600,
          color: 'var(--sg-text-2)'
        }
      }, "Mobile"))
    }), /*#__PURE__*/React.createElement(StatRow, null), /*#__PURE__*/React.createElement(RankTrend, null), /*#__PURE__*/React.createElement(Card, null, /*#__PURE__*/React.createElement(CardHead, {
      title: "Keyword positions",
      sub: "With 7-day history \xB7 violet AI badge = also in AI Overviews"
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: '1fr 110px 96px 96px 90px 90px',
        gap: 12,
        padding: '10px 20px',
        borderBottom: '1px solid var(--sg-border)',
        fontSize: 10.5,
        fontWeight: 700,
        letterSpacing: '0.05em',
        textTransform: 'uppercase',
        color: 'var(--sg-text-3)'
      }
    }, /*#__PURE__*/React.createElement("span", null, "Keyword"), /*#__PURE__*/React.createElement("span", null, "Position"), /*#__PURE__*/React.createElement("span", null, "7-day"), /*#__PURE__*/React.createElement("span", null, "Best / Worst"), /*#__PURE__*/React.createElement("span", null, "Volume"), /*#__PURE__*/React.createElement("span", null, "SERP")), ROWS.map((r, i) => /*#__PURE__*/React.createElement(RankRow, {
      key: i,
      r: r,
      last: i === ROWS.length - 1
    }))));
  }
  window.SGRankTracking = RankTracking;
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/seo-geo/SGRankTracking.jsx", error: String((e && e.message) || e) }); }

// ui_kits/seo-geo/SGReports.jsx
try { (() => {
// ABC SEO/GEO — Block 6: Reports (white-label list + client-facing viewer).
(function () {
  const {
    Icon
  } = window.SGIcons;
  const {
    Card,
    CardHead,
    Gauge,
    PageHead
  } = window.SGKit;

  /* ── shared pills ── */
  function TypePill({
    t
  }) {
    const m = {
      SEO: {
        c: 'var(--sg-blue-600)',
        bg: 'var(--sg-blue-50)'
      },
      GEO: {
        c: 'var(--sg-violet-700)',
        bg: 'var(--sg-violet-100)'
      },
      Combined: {
        c: 'var(--sg-text)',
        bg: 'var(--sg-sunken)'
      }
    }[t];
    return /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        fontSize: 11.5,
        fontWeight: 700,
        color: m.c,
        background: m.bg,
        padding: '3px 10px',
        borderRadius: 'var(--sg-radius-pill)'
      }
    }, t === 'GEO' && /*#__PURE__*/React.createElement(Icon, {
      name: "sparkles",
      size: 11
    }), t);
  }
  function StatusPill({
    s
  }) {
    const m = {
      Delivered: {
        c: 'var(--sg-text-2)',
        bg: 'var(--sg-sunken)'
      },
      Opened: {
        c: 'var(--sg-green)',
        bg: 'var(--sg-green-50)'
      },
      Scheduled: {
        c: 'var(--sg-amber)',
        bg: 'var(--sg-amber-50)'
      }
    }[s];
    return /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 11.5,
        fontWeight: 700,
        color: m.c,
        background: m.bg,
        padding: '3px 10px',
        borderRadius: 'var(--sg-radius-pill)'
      }
    }, s);
  }
  function Avatars({
    names
  }) {
    const pal = ['#2563EB', '#7C3AED', '#16A34A', '#F59E0B'];
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex'
      }
    }, names.map((n, i) => /*#__PURE__*/React.createElement("span", {
      key: i,
      title: n,
      style: {
        width: 26,
        height: 26,
        borderRadius: '50%',
        background: pal[i % 4],
        border: '2px solid var(--sg-card)',
        marginLeft: i ? -8 : 0,
        color: '#fff',
        fontSize: 11,
        fontWeight: 700,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center'
      }
    }, n.split(' ').map(p => p[0]).join('').slice(0, 2))));
  }
  function Switch({
    on: initial
  }) {
    const [on, setOn] = React.useState(initial);
    return /*#__PURE__*/React.createElement("button", {
      onClick: () => setOn(v => !v),
      "aria-label": "toggle",
      style: {
        width: 40,
        height: 23,
        borderRadius: 999,
        border: 'none',
        cursor: 'pointer',
        padding: 2,
        background: on ? 'var(--sg-blue-500)' : 'var(--sg-border-2)',
        transition: 'background 160ms var(--sg-ease)',
        display: 'flex',
        justifyContent: on ? 'flex-end' : 'flex-start'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: 19,
        height: 19,
        borderRadius: '50%',
        background: '#fff',
        boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
        transition: 'all 160ms var(--sg-ease)'
      }
    }));
  }

  /* ── data ── */
  const MINI = [{
    label: 'Reports sent',
    value: '24',
    icon: 'send'
  }, {
    label: 'Scheduled',
    value: '6',
    icon: 'clock'
  }, {
    label: 'Open rate',
    value: '72%',
    icon: 'eye'
  }, {
    label: 'Last sent',
    value: '2 days ago',
    icon: 'calendar'
  }];
  const SCHEDULED = [{
    name: 'Monthly SEO + GEO Summary',
    site: 'the4sale.com',
    cadence: 'Monthly',
    next: 'Jul 1',
    recip: ['Al Bolourchi', 'Sara Kim'],
    on: true
  }, {
    name: 'Weekly Rank Movement',
    site: 'gtaluxuryhomes.ca',
    cadence: 'Weekly',
    next: 'Mon',
    recip: ['Dev Patel'],
    on: true
  }, {
    name: 'AI Visibility Check-in',
    site: 'the4sale.com',
    cadence: 'Monthly',
    next: 'Jul 8',
    recip: ['Al Bolourchi', 'Mara Lee', 'Tom Ng'],
    on: false
  }];
  const RECENT = [{
    name: 'June SEO + GEO Summary',
    type: 'Combined',
    site: 'the4sale.com',
    date: 'Jun 20, 2026',
    status: 'Opened'
  }, {
    name: 'AI Visibility Report',
    type: 'GEO',
    site: 'the4sale.com',
    date: 'Jun 18, 2026',
    status: 'Opened'
  }, {
    name: 'Weekly Rank Movement',
    type: 'SEO',
    site: 'gtaluxuryhomes.ca',
    date: 'Jun 16, 2026',
    status: 'Delivered'
  }, {
    name: 'Full Site Audit',
    type: 'SEO',
    site: 'the4sale.com',
    date: 'Jun 12, 2026',
    status: 'Opened'
  }, {
    name: 'AI Visibility Report',
    type: 'GEO',
    site: 'gtaluxuryhomes.ca',
    date: 'Jun 10, 2026',
    status: 'Delivered'
  }, {
    name: 'Local SEO Snapshot',
    type: 'SEO',
    site: 'the4sale.com',
    date: 'Jun 5, 2026',
    status: 'Opened'
  }, {
    name: 'May SEO + GEO Summary',
    type: 'Combined',
    site: 'the4sale.com',
    date: 'Jun 1, 2026',
    status: 'Delivered'
  }, {
    name: 'July SEO + GEO Summary',
    type: 'Combined',
    site: 'the4sale.com',
    date: 'Scheduled Jul 1',
    status: 'Scheduled'
  }];
  const TEMPLATES = [{
    name: 'Executive Summary',
    icon: 'file-text',
    grad: 'var(--sg-grad-brand)'
  }, {
    name: 'Full Audit',
    icon: 'activity',
    grad: 'linear-gradient(135deg,#1E50C8,#5B8DEF)'
  }, {
    name: 'AI Visibility Report',
    icon: 'sparkles',
    grad: 'var(--sg-grad-violet)'
  }, {
    name: 'Local SEO',
    icon: 'target',
    grad: 'linear-gradient(135deg,#0D1B5E,#1E50C8)'
  }];
  function MiniStat({
    s
  }) {
    return /*#__PURE__*/React.createElement(Card, {
      style: {
        padding: 16,
        display: 'flex',
        alignItems: 'center',
        gap: 12
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: 38,
        height: 38,
        borderRadius: 10,
        background: 'var(--sg-blue-50)',
        color: 'var(--sg-blue-600)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flex: 'none'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: s.icon,
      size: 18
    })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      className: "sg-tnum",
      style: {
        fontFamily: 'var(--sg-font-display)',
        fontWeight: 700,
        fontSize: 21,
        color: 'var(--sg-text)',
        lineHeight: 1
      }
    }, s.value), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        color: 'var(--sg-text-2)',
        marginTop: 4
      }
    }, s.label)));
  }
  function ActionLink({
    icon,
    label,
    onClick
  }) {
    const [h, setH] = React.useState(false);
    return /*#__PURE__*/React.createElement("button", {
      onClick: onClick,
      onMouseEnter: () => setH(true),
      onMouseLeave: () => setH(false),
      title: label,
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        height: 30,
        padding: '0 10px',
        border: '1px solid var(--sg-border)',
        borderRadius: 'var(--sg-radius-pill)',
        background: h ? 'var(--sg-sunken)' : 'var(--sg-card)',
        cursor: 'pointer',
        fontFamily: 'var(--sg-font-sans)',
        fontSize: 12,
        fontWeight: 600,
        color: 'var(--sg-text-2)'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: icon,
      size: 13
    }), " ", label);
  }

  /* ── viewer ── */
  function Section({
    title,
    ai,
    children
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        borderTop: '1px solid var(--sg-border)',
        padding: '26px 0'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginBottom: 16
      }
    }, ai && /*#__PURE__*/React.createElement(Icon, {
      name: "sparkles",
      size: 17,
      color: "var(--sg-violet-600)"
    }), /*#__PURE__*/React.createElement("h3", {
      style: {
        margin: 0,
        fontFamily: 'var(--sg-font-display)',
        fontWeight: 600,
        fontSize: 19,
        color: 'var(--sg-text)'
      }
    }, title)), children);
  }
  function MiniMetric({
    label,
    value,
    delta,
    dir
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        border: '1px solid var(--sg-border)',
        borderRadius: 'var(--sg-radius-md)',
        padding: '14px 16px'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        color: 'var(--sg-text-2)',
        marginBottom: 8
      }
    }, label), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'baseline',
        gap: 8
      }
    }, /*#__PURE__*/React.createElement("span", {
      className: "sg-tnum",
      style: {
        fontFamily: 'var(--sg-font-display)',
        fontWeight: 700,
        fontSize: 24,
        color: 'var(--sg-text)'
      }
    }, value), delta && /*#__PURE__*/React.createElement("span", {
      className: "sg-tnum",
      style: {
        fontSize: 12.5,
        fontWeight: 700,
        color: dir === 'down' ? 'var(--sg-red)' : 'var(--sg-green)'
      }
    }, dir === 'down' ? '▼' : '▲', " ", delta)));
  }
  function ReportViewer({
    onClose
  }) {
    const tools = [{
      icon: 'download',
      label: 'Download PDF',
      primary: true
    }, {
      icon: 'send',
      label: 'Send to client'
    }, {
      icon: 'clock',
      label: 'Schedule'
    }, {
      icon: 'edit',
      label: 'Edit branding'
    }];
    return /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'fixed',
        inset: 0,
        background: 'rgba(12,14,40,0.55)',
        backdropFilter: 'blur(3px)',
        zIndex: 60,
        display: 'flex',
        flexDirection: 'column',
        animation: 'sg-fade 0.2s var(--sg-ease)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        height: 60,
        flex: 'none',
        background: 'var(--sg-card)',
        borderBottom: '1px solid var(--sg-border)',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '0 20px'
      }
    }, /*#__PURE__*/React.createElement("button", {
      onClick: onClose,
      "aria-label": "Close",
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        border: '1px solid var(--sg-border)',
        borderRadius: 'var(--sg-radius-pill)',
        background: 'var(--sg-card)',
        cursor: 'pointer',
        height: 36,
        padding: '0 12px',
        fontSize: 13,
        fontWeight: 600,
        color: 'var(--sg-text-2)'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "x",
      size: 16
    }), " Close"), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 13,
        color: 'var(--sg-text-3)'
      }
    }, "Report preview \xB7 client-facing"), /*#__PURE__*/React.createElement("div", {
      style: {
        marginLeft: 'auto',
        display: 'flex',
        gap: 9
      }
    }, tools.map(t => /*#__PURE__*/React.createElement("button", {
      key: t.label,
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 7,
        height: 36,
        padding: '0 14px',
        borderRadius: 'var(--sg-radius-pill)',
        cursor: 'pointer',
        border: t.primary ? 'none' : '1px solid var(--sg-border)',
        fontFamily: 'var(--sg-font-sans)',
        fontWeight: 700,
        fontSize: 13,
        color: t.primary ? '#fff' : 'var(--sg-text)',
        background: t.primary ? 'var(--sg-grad-brand)' : 'var(--sg-card)',
        boxShadow: t.primary ? '0 3px 10px rgba(37,99,235,0.26)' : 'none'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: t.icon,
      size: 15
    }), " ", t.label)))), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        overflow: 'auto',
        padding: '28px 20px 60px'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        maxWidth: 820,
        margin: '0 auto',
        background: 'var(--sg-card)',
        borderRadius: 'var(--sg-radius-lg)',
        boxShadow: 'var(--sg-shadow-lg)',
        overflow: 'hidden'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        background: 'var(--sg-grad-navy)',
        color: '#fff',
        padding: '34px 40px',
        position: 'relative',
        overflow: 'hidden'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        top: -50,
        right: -30,
        width: 220,
        height: 220,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(124,58,237,0.4), transparent 70%)'
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        position: 'relative'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: 32,
        height: 32,
        borderRadius: 9,
        background: 'var(--sg-grad-brand)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "play",
      size: 14,
      color: "#fff"
    })), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--sg-font-logo)',
        fontWeight: 600,
        fontSize: 16
      }
    }, "AI Biz Connect")), /*#__PURE__*/React.createElement("h1", {
      style: {
        fontFamily: 'var(--sg-font-display)',
        fontWeight: 700,
        fontSize: 30,
        letterSpacing: '-0.02em',
        margin: '26px 0 10px',
        position: 'relative'
      }
    }, "SEO + GEO Performance Report"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 24,
        flexWrap: 'wrap',
        fontSize: 13.5,
        color: 'rgba(226,232,240,0.82)',
        position: 'relative'
      }
    }, /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("strong", {
      style: {
        color: '#fff'
      }
    }, "Client:"), " the4sale.com"), /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("strong", {
      style: {
        color: '#fff'
      }
    }, "Period:"), " Jun 1 \u2013 Jun 30, 2026"), /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("strong", {
      style: {
        color: '#fff'
      }
    }, "Prepared by:"), " Al Bolourchi, AI Biz Connect"))), /*#__PURE__*/React.createElement("div", {
      style: {
        padding: '8px 40px 36px'
      }
    }, /*#__PURE__*/React.createElement(Section, {
      title: "Executive summary"
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 28,
        alignItems: 'center',
        flexWrap: 'wrap'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 22
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        textAlign: 'center'
      }
    }, /*#__PURE__*/React.createElement(Gauge, {
      value: 78,
      color: "var(--sg-blue-500)",
      size: 120,
      suffix: "/100",
      big: 30
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12.5,
        fontWeight: 600,
        color: 'var(--sg-text-2)',
        marginTop: 8
      }
    }, "SEO Health")), /*#__PURE__*/React.createElement("div", {
      style: {
        textAlign: 'center'
      }
    }, /*#__PURE__*/React.createElement(Gauge, {
      value: 64,
      color: "var(--sg-violet-600)",
      size: 120,
      suffix: "/100",
      big: 30
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12.5,
        fontWeight: 600,
        color: 'var(--sg-text-2)',
        marginTop: 8
      }
    }, "AI Visibility"))), /*#__PURE__*/React.createElement("p", {
      style: {
        flex: 1,
        minWidth: 280,
        fontSize: 14,
        color: 'var(--sg-text)',
        lineHeight: 1.65,
        margin: 0
      }
    }, "A strong month. Your SEO health climbed ", /*#__PURE__*/React.createElement("strong", null, "+4 points"), " and AI visibility jumped ", /*#__PURE__*/React.createElement("strong", null, "+9"), " as more answer engines began citing the4sale.com. Organic traffic is up 3% and you now appear in ", /*#__PURE__*/React.createElement("strong", null, "37 AI answers"), " for high-intent property searches across the GTA. The biggest opportunity remains foreclosure-related prompts, where competitors still lead."))), /*#__PURE__*/React.createElement(Section, {
      title: "Traffic & rankings snapshot"
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: 'repeat(4,1fr)',
        gap: 12
      }
    }, /*#__PURE__*/React.createElement(MiniMetric, {
      label: "Organic traffic",
      value: "8,430",
      delta: "3%",
      dir: "up"
    }), /*#__PURE__*/React.createElement(MiniMetric, {
      label: "Organic keywords",
      value: "1,284",
      delta: "6%",
      dir: "up"
    }), /*#__PURE__*/React.createElement(MiniMetric, {
      label: "Top-3 rankings",
      value: "28",
      delta: "5",
      dir: "up"
    }), /*#__PURE__*/React.createElement(MiniMetric, {
      label: "Avg. position",
      value: "14.2",
      delta: "1.3",
      dir: "up"
    }))), /*#__PURE__*/React.createElement(Section, {
      title: "Site health"
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 20,
        alignItems: 'center',
        flexWrap: 'wrap'
      }
    }, /*#__PURE__*/React.createElement(Gauge, {
      value: 82,
      color: "var(--sg-blue-500)",
      size: 108,
      suffix: "%",
      big: 26
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 10,
        flexWrap: 'wrap'
      }
    }, [['12', 'Errors', 'var(--sg-red)'], ['47', 'Warnings', 'var(--sg-amber)'], ['88', 'Notices', 'var(--sg-text-2)'], ['1,204', 'Passed', 'var(--sg-green)']].map(([v, l, c]) => /*#__PURE__*/React.createElement("div", {
      key: l,
      style: {
        border: '1px solid var(--sg-border)',
        borderRadius: 'var(--sg-radius-md)',
        padding: '12px 18px',
        minWidth: 96
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "sg-tnum",
      style: {
        fontFamily: 'var(--sg-font-display)',
        fontWeight: 700,
        fontSize: 22,
        color: c
      }
    }, v), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        color: 'var(--sg-text-2)',
        marginTop: 2
      }
    }, l)))))), /*#__PURE__*/React.createElement(Section, {
      title: "AI Visibility",
      ai: true
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 11,
        marginBottom: 18
      }
    }, [['ChatGPT', 71, '#10A37F'], ['Perplexity', 58, '#20808D'], ['Google AI Overviews', 49, '#4285F4'], ['Gemini', 44, '#8E75F0'], ['Copilot', 38, '#0A6ED1']].map(([n, p, c]) => /*#__PURE__*/React.createElement("div", {
      key: n,
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 12
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: 130,
        fontSize: 13,
        color: 'var(--sg-text)'
      }
    }, n), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        height: 8,
        borderRadius: 999,
        background: 'var(--sg-violet-50)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: p + '%',
        height: '100%',
        borderRadius: 999,
        background: 'var(--sg-grad-violet)'
      }
    })), /*#__PURE__*/React.createElement("span", {
      className: "sg-tnum",
      style: {
        width: 38,
        textAlign: 'right',
        fontSize: 13,
        fontWeight: 700,
        color: 'var(--sg-violet-700)'
      }
    }, p, "%")))), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12.5,
        fontWeight: 700,
        color: 'var(--sg-text-2)',
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        margin: '6px 0 8px'
      }
    }, "Sample prompt citations"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 8
      }
    }, [['"best real estate deals in the GTA"', '#2', 'ChatGPT, Perplexity, Gemini'], ['"the4sale.com reviews — is it legit?"', '#1', 'ChatGPT, Copilot, Gemini']].map(([q, pos, eng]) => /*#__PURE__*/React.createElement("div", {
      key: q,
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        background: 'var(--sg-violet-50)',
        borderRadius: 'var(--sg-radius-md)',
        padding: '11px 14px'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "message-square",
      size: 15,
      color: "var(--sg-violet-600)"
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1,
        fontSize: 13,
        color: 'var(--sg-text)'
      }
    }, q), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 12,
        color: 'var(--sg-text-2)'
      }
    }, eng), /*#__PURE__*/React.createElement("span", {
      className: "sg-tnum",
      style: {
        fontSize: 13,
        fontWeight: 700,
        color: 'var(--sg-violet-700)'
      }
    }, pos))))), /*#__PURE__*/React.createElement(Section, {
      title: "Top wins this month"
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 10
      }
    }, ['Entered the top 3 for "real estate deals toronto" (was #5).', 'First citations in Google AI Overviews — up 21% in mention share.', 'Cleared 9 crawl errors; site health rose to 82%.'].map(w => /*#__PURE__*/React.createElement("div", {
      key: w,
      style: {
        display: 'flex',
        gap: 10,
        alignItems: 'flex-start',
        fontSize: 14,
        color: 'var(--sg-text)'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "check",
      size: 18,
      color: "var(--sg-green)",
      strokeWidth: 2.6,
      style: {
        flex: 'none',
        marginTop: 1
      }
    }), w)))), /*#__PURE__*/React.createElement(Section, {
      title: "What we're working on next"
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 10
      }
    }, [['Add an FAQ about foreclosure listings', 'HIGH · GEO'], ['Speed up the top landing page (LCP 3.8s)', 'HIGH · SEO'], ['Publish a "best platforms" comparison page', 'MED · GEO']].map(([t, tag], i) => /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        border: '1px solid var(--sg-border)',
        borderRadius: 'var(--sg-radius-md)',
        padding: '12px 16px'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: 24,
        height: 24,
        borderRadius: 7,
        background: 'var(--sg-violet-100)',
        color: 'var(--sg-violet-700)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 700,
        fontSize: 12,
        fontFamily: 'var(--sg-font-display)'
      }
    }, i + 1), /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1,
        fontSize: 14,
        color: 'var(--sg-text)'
      }
    }, t), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '0.04em',
        color: tag.includes('GEO') ? 'var(--sg-violet-700)' : 'var(--sg-blue-600)',
        background: tag.includes('GEO') ? 'var(--sg-violet-100)' : 'var(--sg-blue-50)',
        padding: '4px 9px',
        borderRadius: 'var(--sg-radius-pill)'
      }
    }, tag)))))), /*#__PURE__*/React.createElement("div", {
      style: {
        borderTop: '1px solid var(--sg-border)',
        background: 'var(--sg-sunken)',
        padding: '18px 40px',
        textAlign: 'center',
        fontSize: 12.5,
        color: 'var(--sg-text-2)'
      }
    }, "Prepared by ", /*#__PURE__*/React.createElement("strong", {
      style: {
        color: 'var(--sg-text)'
      }
    }, "AI Biz Connect"), " \xB7 www.AIBizConnect.ca \xB7 +1 (416) 727-7111"))));
  }
  function Reports() {
    const [viewing, setViewing] = React.useState(false);
    return /*#__PURE__*/React.createElement("div", {
      style: {
        maxWidth: 1180,
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 20
      }
    }, /*#__PURE__*/React.createElement(PageHead, {
      eyebrow: "Deliver",
      title: "Reports",
      sub: "White-label SEO + GEO reports for your clients.",
      right: /*#__PURE__*/React.createElement("button", {
        style: {
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          height: 42,
          padding: '0 18px',
          border: 'none',
          borderRadius: 'var(--sg-radius-pill)',
          cursor: 'pointer',
          fontFamily: 'var(--sg-font-sans)',
          fontWeight: 700,
          fontSize: 14,
          color: '#fff',
          background: 'var(--sg-grad-brand)',
          boxShadow: '0 3px 10px rgba(37,99,235,0.26)'
        }
      }, /*#__PURE__*/React.createElement(Icon, {
        name: "plus",
        size: 16
      }), " New report")
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: 'repeat(4,1fr)',
        gap: 16
      }
    }, MINI.map(s => /*#__PURE__*/React.createElement(MiniStat, {
      key: s.label,
      s: s
    }))), /*#__PURE__*/React.createElement(Card, null, /*#__PURE__*/React.createElement(CardHead, {
      title: "Scheduled reports",
      sub: "Automated delivery \u2014 toggle any off to pause",
      icon: "clock"
    }), SCHEDULED.map((r, i) => /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        display: 'grid',
        gridTemplateColumns: '1.6fr 1fr 110px 120px 90px 50px',
        alignItems: 'center',
        gap: 14,
        padding: '14px 20px',
        borderBottom: i < SCHEDULED.length - 1 ? '1px solid var(--sg-border)' : 'none'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 11,
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: 34,
        height: 34,
        borderRadius: 9,
        background: 'var(--sg-blue-50)',
        color: 'var(--sg-blue-600)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flex: 'none'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "file-text",
      size: 16
    })), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 13.5,
        fontWeight: 600,
        color: 'var(--sg-text)',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap'
      }
    }, r.name)), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 13,
        color: 'var(--sg-text-2)',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap'
      }
    }, r.site), /*#__PURE__*/React.createElement("span", {
      style: {
        justifySelf: 'start',
        fontSize: 11.5,
        fontWeight: 700,
        color: 'var(--sg-text-2)',
        background: 'var(--sg-sunken)',
        border: '1px solid var(--sg-border)',
        padding: '3px 11px',
        borderRadius: 'var(--sg-radius-pill)'
      }
    }, r.cadence), /*#__PURE__*/React.createElement("span", {
      className: "sg-tnum",
      style: {
        fontSize: 13,
        color: 'var(--sg-text-2)'
      }
    }, "Next ", r.next), /*#__PURE__*/React.createElement(Avatars, {
      names: r.recip
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        justifySelf: 'end'
      }
    }, /*#__PURE__*/React.createElement(Switch, {
      on: r.on
    }))))), /*#__PURE__*/React.createElement(Card, null, /*#__PURE__*/React.createElement(CardHead, {
      title: "Recent reports",
      sub: "Sent and scheduled across all clients"
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: '1.5fr 110px 1fr 130px 110px 250px',
        gap: 14,
        padding: '10px 20px',
        borderBottom: '1px solid var(--sg-border)',
        fontSize: 10.5,
        fontWeight: 700,
        letterSpacing: '0.05em',
        textTransform: 'uppercase',
        color: 'var(--sg-text-3)'
      }
    }, /*#__PURE__*/React.createElement("span", null, "Report"), /*#__PURE__*/React.createElement("span", null, "Type"), /*#__PURE__*/React.createElement("span", null, "Site"), /*#__PURE__*/React.createElement("span", null, "Date sent"), /*#__PURE__*/React.createElement("span", null, "Status"), /*#__PURE__*/React.createElement("span", null, "Actions")), RECENT.map((r, i) => /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        display: 'grid',
        gridTemplateColumns: '1.5fr 110px 1fr 130px 110px 250px',
        alignItems: 'center',
        gap: 14,
        padding: '12px 20px',
        borderBottom: i < RECENT.length - 1 ? '1px solid var(--sg-border)' : 'none'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 13.5,
        fontWeight: 600,
        color: 'var(--sg-text)',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap'
      }
    }, r.name), /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement(TypePill, {
      t: r.type
    })), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 13,
        color: 'var(--sg-text-2)',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap'
      }
    }, r.site), /*#__PURE__*/React.createElement("span", {
      className: "sg-tnum",
      style: {
        fontSize: 12.5,
        color: 'var(--sg-text-2)'
      }
    }, r.date), /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement(StatusPill, {
      s: r.status
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 7
      }
    }, /*#__PURE__*/React.createElement(ActionLink, {
      icon: "eye",
      label: "View",
      onClick: () => setViewing(true)
    }), /*#__PURE__*/React.createElement(ActionLink, {
      icon: "download",
      label: "PDF"
    }), /*#__PURE__*/React.createElement(ActionLink, {
      icon: "refresh-cw",
      label: "Resend"
    }))))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        fontWeight: 700,
        color: 'var(--sg-text)',
        marginBottom: 12
      }
    }, "Report templates"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: 'repeat(4,1fr)',
        gap: 16
      }
    }, TEMPLATES.map(t => /*#__PURE__*/React.createElement(Card, {
      key: t.name,
      style: {
        overflow: 'hidden'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        height: 84,
        background: t.grad,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: t.icon,
      size: 30,
      color: "#fff"
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        padding: 14,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 13.5,
        fontWeight: 600,
        color: 'var(--sg-text)'
      }
    }, t.name), /*#__PURE__*/React.createElement("button", {
      onClick: () => setViewing(true),
      style: {
        fontSize: 12.5,
        fontWeight: 700,
        color: 'var(--sg-blue-600)',
        background: 'var(--sg-blue-50)',
        border: 'none',
        borderRadius: 'var(--sg-radius-pill)',
        padding: '5px 14px',
        cursor: 'pointer'
      }
    }, "Use")))))), viewing && /*#__PURE__*/React.createElement(ReportViewer, {
      onClose: () => setViewing(false)
    }));
  }
  window.SGReports = Reports;
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/seo-geo/SGReports.jsx", error: String((e && e.message) || e) }); }

// ui_kits/seo-geo/SGSidebar.jsx
try { (() => {
// ABC SEO/GEO — left sidebar. Dark navy gradient, grouped nav, PRO usage card.
const {
  Icon
} = window.SGIcons;
const SG_NAV = [{
  group: 'Overview',
  items: [{
    id: 'dashboard',
    label: 'Dashboard',
    icon: 'layout-dashboard'
  }, {
    id: 'geo',
    label: 'GEO / AI Visibility',
    icon: 'sparkles',
    ai: true
  }]
}, {
  group: 'Research',
  items: [{
    id: 'audit',
    label: 'Site Audit',
    icon: 'activity'
  }, {
    id: 'keywords',
    label: 'Keywords',
    icon: 'key'
  }, {
    id: 'rank',
    label: 'Rank Tracking',
    icon: 'list-ordered'
  }, {
    id: 'competitors',
    label: 'Competitors',
    icon: 'target'
  }, {
    id: 'backlinks',
    label: 'Backlinks',
    icon: 'link'
  }]
}, {
  group: 'Deliver',
  items: [{
    id: 'reports',
    label: 'Reports',
    icon: 'file-text'
  }, {
    id: 'settings',
    label: 'Settings',
    icon: 'settings'
  }]
}];
function SGNavItem({
  item,
  active,
  onClick
}) {
  const [hover, setHover] = React.useState(false);
  return /*#__PURE__*/React.createElement("button", {
    onClick: onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 11,
      width: '100%',
      padding: '0 12px',
      height: 40,
      border: 'none',
      borderRadius: 'var(--sg-radius-md)',
      cursor: 'pointer',
      textAlign: 'left',
      fontFamily: 'var(--sg-font-sans)',
      fontSize: 14,
      fontWeight: active ? 600 : 500,
      background: active ? 'rgba(255,255,255,0.13)' : hover ? 'rgba(255,255,255,0.06)' : 'transparent',
      color: active ? '#FFFFFF' : 'rgba(226,232,240,0.78)',
      transition: 'background 140ms var(--sg-ease), color 140ms var(--sg-ease)',
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: item.icon,
    size: 18,
    strokeWidth: active ? 2.3 : 2,
    color: item.ai ? 'var(--sg-violet-500)' : 'inherit'
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1
    }
  }, item.label), item.ai && /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 9,
      fontWeight: 700,
      letterSpacing: '0.06em',
      color: '#C9B6F7',
      background: 'rgba(139,92,246,0.22)',
      padding: '2px 6px',
      borderRadius: 'var(--sg-radius-pill)'
    }
  }, "AI"), /*#__PURE__*/React.createElement("span", {
    style: {
      width: 7,
      height: 7,
      borderRadius: '50%',
      background: 'var(--sg-violet-500)',
      boxShadow: '0 0 8px rgba(139,92,246,0.9)'
    }
  })));
}
function SGSidebar({
  active,
  onNavigate,
  collapsed
}) {
  return /*#__PURE__*/React.createElement("aside", {
    style: {
      width: collapsed ? 0 : 248,
      flex: 'none',
      background: 'var(--sg-grad-navy)',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      transition: 'width 200ms var(--sg-ease)',
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: -40,
      left: -30,
      width: 180,
      height: 180,
      borderRadius: '50%',
      background: 'radial-gradient(circle, rgba(124,58,237,0.30), transparent 70%)',
      pointerEvents: 'none'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '20px 18px 16px',
      display: 'flex',
      alignItems: 'center',
      gap: 11,
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 34,
      height: 34,
      borderRadius: 10,
      background: 'var(--sg-grad-brand)',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      flex: 'none',
      boxShadow: '0 4px 12px rgba(37,99,235,0.45)'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "play",
    size: 15,
    color: "#fff"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      lineHeight: 1.05
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--sg-font-logo)',
      fontWeight: 600,
      fontSize: 16,
      color: '#fff',
      letterSpacing: '-0.01em'
    }
  }, "ABC ", /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--sg-violet-500)'
    }
  }, "SEO/GEO")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10.5,
      fontWeight: 500,
      letterSpacing: '0.14em',
      color: 'rgba(184,204,247,0.65)',
      textTransform: 'uppercase',
      marginTop: 2
    }
  }, "SEO + GEO Suite"))), /*#__PURE__*/React.createElement("nav", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 14,
      padding: '8px 12px',
      overflowY: 'auto',
      flex: 1
    }
  }, SG_NAV.map(g => /*#__PURE__*/React.createElement("div", {
    key: g.group,
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 3
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10.5,
      fontWeight: 700,
      letterSpacing: '0.1em',
      textTransform: 'uppercase',
      color: 'rgba(148,163,184,0.7)',
      padding: '4px 12px 4px'
    }
  }, g.group), g.items.map(it => /*#__PURE__*/React.createElement(SGNavItem, {
    key: it.id,
    item: it,
    active: active === it.id,
    onClick: () => onNavigate(it.id)
  }))))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 14,
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'rgba(255,255,255,0.06)',
      border: '1px solid rgba(255,255,255,0.12)',
      borderRadius: 'var(--sg-radius-lg)',
      padding: 16,
      color: '#fff'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 7,
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "zap",
    size: 15,
    color: "var(--sg-violet-500)"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12.5,
      fontWeight: 700
    }
  }, "Growth Plan"), /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: 'auto',
      fontSize: 10,
      fontWeight: 700,
      letterSpacing: '0.06em',
      color: '#C9B6F7',
      background: 'rgba(139,92,246,0.22)',
      padding: '2px 7px',
      borderRadius: 'var(--sg-radius-pill)'
    }
  }, "PRO")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: 'rgba(226,232,240,0.72)',
      marginBottom: 6
    }
  }, "AI checks used this month"), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 6,
      borderRadius: 999,
      background: 'rgba(255,255,255,0.12)',
      overflow: 'hidden',
      marginBottom: 7
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: '74%',
      height: '100%',
      borderRadius: 999,
      background: 'var(--sg-grad-violet)'
    }
  })), /*#__PURE__*/React.createElement("div", {
    className: "sg-tnum",
    style: {
      fontSize: 11.5,
      color: 'rgba(226,232,240,0.6)',
      marginBottom: 12
    }
  }, "740 of 1,000"), /*#__PURE__*/React.createElement("button", {
    style: {
      width: '100%',
      height: 36,
      border: 'none',
      borderRadius: 'var(--sg-radius-pill)',
      background: '#fff',
      color: 'var(--sg-navy-900)',
      fontFamily: 'var(--sg-font-sans)',
      fontWeight: 700,
      fontSize: 13,
      cursor: 'pointer'
    }
  }, "Upgrade plan")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      marginTop: 12,
      padding: '8px 8px',
      borderRadius: 'var(--sg-radius-md)',
      cursor: 'pointer'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 34,
      height: 34,
      borderRadius: '50%',
      background: 'var(--sg-grad-violet)',
      flex: 'none',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#fff',
      fontWeight: 700,
      fontSize: 13
    }
  }, "AB"), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0,
      lineHeight: 1.2
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      fontWeight: 600,
      color: '#fff',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap'
    }
  }, "Al Bolourchi"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: 'rgba(148,163,184,0.8)'
    }
  }, "Agency Admin")), /*#__PURE__*/React.createElement(Icon, {
    name: "chevron-down",
    size: 16,
    color: "rgba(148,163,184,0.8)"
  }))));
}
window.SGSidebar = SGSidebar;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/seo-geo/SGSidebar.jsx", error: String((e && e.message) || e) }); }

// ui_kits/seo-geo/SGSiteAudit.jsx
try { (() => {
// ABC SEO/GEO — Block 3: Site Audit. Health gauge, Core Web Vitals, issues table.
(function () {
  const {
    Icon
  } = window.SGIcons;
  const {
    Card,
    CardHead,
    Gauge,
    PageHead,
    ActionBtn
  } = window.SGKit;

  /* health hero + counts */
  const COUNTS = [{
    label: 'Errors',
    value: 12,
    color: 'var(--sg-red)',
    bg: 'var(--sg-red-50)',
    icon: 'x'
  }, {
    label: 'Warnings',
    value: 47,
    color: 'var(--sg-amber)',
    bg: 'var(--sg-amber-50)',
    icon: 'info'
  }, {
    label: 'Notices',
    value: 88,
    color: 'var(--sg-text-2)',
    bg: 'var(--sg-sunken)',
    icon: 'eye'
  }, {
    label: 'Passed',
    value: '1,204',
    color: 'var(--sg-green)',
    bg: 'var(--sg-green-50)',
    icon: 'check'
  }];
  function HealthHero() {
    return /*#__PURE__*/React.createElement(Card, {
      style: {
        padding: 24,
        display: 'flex',
        alignItems: 'center',
        gap: 28,
        flexWrap: 'wrap',
        animation: 'sg-rise 0.4s var(--sg-ease) both'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 20,
        flex: '1 1 300px'
      }
    }, /*#__PURE__*/React.createElement(Gauge, {
      value: 82,
      color: "var(--sg-blue-500)",
      size: 148,
      suffix: "%"
    }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: 'var(--sg-font-display)',
        fontWeight: 600,
        fontSize: 18,
        color: 'var(--sg-text)'
      }
    }, "Site Health"), /*#__PURE__*/React.createElement("p", {
      style: {
        margin: '6px 0 0',
        fontSize: 13,
        color: 'var(--sg-text-2)',
        maxWidth: 230,
        lineHeight: 1.5
      }
    }, "Healthy overall. Clearing the 12 errors first will give you the biggest lift."))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 12,
        flex: '1 1 320px'
      }
    }, COUNTS.map(c => /*#__PURE__*/React.createElement("div", {
      key: c.label,
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '14px 16px',
        border: '1px solid var(--sg-border)',
        borderRadius: 'var(--sg-radius-md)'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: 36,
        height: 36,
        borderRadius: 10,
        background: c.bg,
        color: c.color,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flex: 'none'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: c.icon,
      size: 18,
      strokeWidth: 2.4
    })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      className: "sg-tnum",
      style: {
        fontFamily: 'var(--sg-font-display)',
        fontWeight: 700,
        fontSize: 22,
        color: c.color,
        lineHeight: 1
      }
    }, c.value), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        color: 'var(--sg-text-2)',
        marginTop: 3
      }
    }, c.label))))));
  }

  /* core web vitals */
  const VITALS = {
    mobile: [{
      k: 'LCP',
      name: 'Largest Contentful Paint',
      v: '3.8s',
      state: 'Poor',
      c: 'var(--sg-red)',
      bg: 'var(--sg-red-50)',
      pct: 38
    }, {
      k: 'INP',
      name: 'Interaction to Next Paint',
      v: '180ms',
      state: 'Needs work',
      c: 'var(--sg-amber)',
      bg: 'var(--sg-amber-50)',
      pct: 64
    }, {
      k: 'CLS',
      name: 'Cumulative Layout Shift',
      v: '0.04',
      state: 'Good',
      c: 'var(--sg-green)',
      bg: 'var(--sg-green-50)',
      pct: 92
    }],
    desktop: [{
      k: 'LCP',
      name: 'Largest Contentful Paint',
      v: '2.1s',
      state: 'Good',
      c: 'var(--sg-green)',
      bg: 'var(--sg-green-50)',
      pct: 88
    }, {
      k: 'INP',
      name: 'Interaction to Next Paint',
      v: '120ms',
      state: 'Good',
      c: 'var(--sg-green)',
      bg: 'var(--sg-green-50)',
      pct: 90
    }, {
      k: 'CLS',
      name: 'Cumulative Layout Shift',
      v: '0.02',
      state: 'Good',
      c: 'var(--sg-green)',
      bg: 'var(--sg-green-50)',
      pct: 96
    }]
  };
  function CoreVitals() {
    const [dev, setDev] = React.useState('mobile');
    return /*#__PURE__*/React.createElement(Card, null, /*#__PURE__*/React.createElement(CardHead, {
      title: "Core Web Vitals",
      sub: "Real-world page experience scores from Google",
      right: /*#__PURE__*/React.createElement("div", {
        style: {
          display: 'inline-flex',
          background: 'var(--sg-sunken)',
          border: '1px solid var(--sg-border)',
          borderRadius: 'var(--sg-radius-pill)',
          padding: 3
        }
      }, ['mobile', 'desktop'].map(d => /*#__PURE__*/React.createElement("button", {
        key: d,
        onClick: () => setDev(d),
        style: {
          height: 30,
          padding: '0 14px',
          border: 'none',
          borderRadius: 'var(--sg-radius-pill)',
          cursor: 'pointer',
          textTransform: 'capitalize',
          fontFamily: 'var(--sg-font-sans)',
          fontWeight: 600,
          fontSize: 12.5,
          background: dev === d ? 'var(--sg-card)' : 'transparent',
          color: dev === d ? 'var(--sg-text)' : 'var(--sg-text-2)',
          boxShadow: dev === d ? 'var(--sg-shadow)' : 'none'
        }
      }, d)))
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 16,
        padding: 20
      }
    }, VITALS[dev].map(m => /*#__PURE__*/React.createElement("div", {
      key: m.k,
      style: {
        border: '1px solid var(--sg-border)',
        borderRadius: 'var(--sg-radius-md)',
        padding: 16
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--sg-font-display)',
        fontWeight: 700,
        fontSize: 13,
        color: 'var(--sg-text-2)',
        letterSpacing: '0.02em'
      }
    }, m.k), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 10.5,
        fontWeight: 700,
        color: m.c,
        background: m.bg,
        padding: '3px 9px',
        borderRadius: 'var(--sg-radius-pill)'
      }
    }, m.state)), /*#__PURE__*/React.createElement("div", {
      className: "sg-tnum",
      style: {
        fontFamily: 'var(--sg-font-display)',
        fontWeight: 700,
        fontSize: 30,
        letterSpacing: '-0.02em',
        color: 'var(--sg-text)',
        margin: '10px 0 4px'
      }
    }, m.v), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11.5,
        color: 'var(--sg-text-3)',
        marginBottom: 12
      }
    }, m.name), /*#__PURE__*/React.createElement("div", {
      style: {
        height: 6,
        borderRadius: 999,
        background: 'var(--sg-sunken)',
        overflow: 'hidden'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: m.pct + '%',
        height: '100%',
        borderRadius: 999,
        background: m.c,
        transformOrigin: 'left',
        animation: 'sg-grow 0.7s var(--sg-ease) both'
      }
    }))))));
  }

  /* issues table */
  const ISSUES = [{
    sev: 'Error',
    c: 'var(--sg-red)',
    bg: 'var(--sg-red-50)',
    items: [{
      t: '12 pages have no meta description',
      pages: 12,
      trend: 'new',
      n: 3
    }, {
      t: 'LCP element is render-blocked on 6 pages',
      pages: 6,
      trend: 'new',
      n: 6
    }]
  }, {
    sev: 'Warning',
    c: 'var(--sg-amber)',
    bg: 'var(--sg-amber-50)',
    items: [{
      t: '8 images are missing alt text',
      pages: 8,
      trend: 'fixed',
      n: 4
    }, {
      t: '14 pages have thin content (under 300 words)',
      pages: 14,
      trend: 'new',
      n: 2
    }, {
      t: '5 internal links point to redirects',
      pages: 5,
      trend: 'fixed',
      n: 5
    }]
  }, {
    sev: 'Notice',
    c: 'var(--sg-text-2)',
    bg: 'var(--sg-sunken)',
    items: [{
      t: '21 pages could use more descriptive titles',
      pages: 21,
      trend: 'new',
      n: 1
    }]
  }];
  function IssueRow({
    it,
    c,
    last
  }) {
    const [open, setOpen] = React.useState(false);
    return /*#__PURE__*/React.createElement("div", {
      style: {
        borderBottom: last ? 'none' : '1px solid var(--sg-border)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: '1fr 110px 90px 120px',
        alignItems: 'center',
        gap: 14,
        padding: '13px 20px'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: 7,
        height: 7,
        borderRadius: '50%',
        background: c,
        flex: 'none'
      }
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 13.5,
        color: 'var(--sg-text)'
      }
    }, it.t)), /*#__PURE__*/React.createElement("span", {
      className: "sg-tnum",
      style: {
        fontSize: 13,
        color: 'var(--sg-text-2)'
      }
    }, it.pages, " pages"), /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        fontSize: 12,
        fontWeight: 700,
        color: it.trend === 'fixed' ? 'var(--sg-green)' : 'var(--sg-violet-700)'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: it.trend === 'fixed' ? 'check' : 'plus',
      size: 13,
      strokeWidth: 2.6
    }), " ", it.n, " ", it.trend), /*#__PURE__*/React.createElement("button", {
      onClick: () => setOpen(o => !o),
      style: {
        justifySelf: 'start',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        fontSize: 12.5,
        fontWeight: 700,
        color: 'var(--sg-blue-600)',
        background: 'none',
        border: 'none',
        cursor: 'pointer'
      }
    }, "How to fix ", /*#__PURE__*/React.createElement(Icon, {
      name: open ? 'chevron-up' : 'chevron-down',
      size: 14
    }))), open && /*#__PURE__*/React.createElement("div", {
      style: {
        padding: '0 20px 16px 37px',
        animation: 'sg-fade 0.2s var(--sg-ease)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 10,
        fontSize: 12.5,
        color: 'var(--sg-text-2)',
        lineHeight: 1.55,
        background: 'var(--sg-sunken)',
        border: '1px solid var(--sg-border)',
        borderRadius: 'var(--sg-radius-md)',
        padding: '12px 14px'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "help-circle",
      size: 16,
      color: "var(--sg-blue-600)",
      style: {
        flex: 'none',
        marginTop: 1
      }
    }), /*#__PURE__*/React.createElement("span", null, "Add a unique 140\u2013160 character summary to each affected page. We can auto-draft them for you, then you approve before publishing."))));
  }
  function IssuesTable() {
    return /*#__PURE__*/React.createElement(Card, null, /*#__PURE__*/React.createElement(CardHead, {
      title: "Issues",
      sub: "Grouped by severity \u2014 start at the top",
      right: /*#__PURE__*/React.createElement("button", {
        style: {
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 12.5,
          fontWeight: 600,
          color: 'var(--sg-text-2)',
          background: 'var(--sg-sunken)',
          border: '1px solid var(--sg-border)',
          borderRadius: 'var(--sg-radius-pill)',
          padding: '6px 12px',
          cursor: 'pointer'
        }
      }, /*#__PURE__*/React.createElement(Icon, {
        name: "download",
        size: 13
      }), " Export")
    }), ISSUES.map(g => /*#__PURE__*/React.createElement("div", {
      key: g.sev
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 9,
        padding: '12px 20px',
        background: 'var(--sg-sunken)',
        borderBottom: '1px solid var(--sg-border)'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        color: g.c,
        background: g.bg,
        padding: '3px 10px',
        borderRadius: 'var(--sg-radius-pill)'
      }
    }, g.sev), /*#__PURE__*/React.createElement("span", {
      className: "sg-tnum",
      style: {
        fontSize: 12,
        color: 'var(--sg-text-3)'
      }
    }, g.items.length, " ", g.items.length === 1 ? 'issue' : 'issues')), g.items.map((it, i) => /*#__PURE__*/React.createElement(IssueRow, {
      key: i,
      it: it,
      c: g.c,
      last: i === g.items.length - 1
    })))));
  }
  function SiteAudit() {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        maxWidth: 1180,
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 20
      }
    }, /*#__PURE__*/React.createElement(PageHead, {
      eyebrow: "Research",
      title: "Site Audit",
      icon: "activity",
      sub: "Last crawled 2 hours ago \xB7 248 pages scanned.",
      right: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("button", {
        style: {
          display: 'inline-flex',
          alignItems: 'center',
          gap: 7,
          height: 42,
          padding: '0 16px',
          border: '1px solid var(--sg-border)',
          borderRadius: 'var(--sg-radius-pill)',
          background: 'var(--sg-card)',
          cursor: 'pointer',
          fontFamily: 'var(--sg-font-sans)',
          fontWeight: 600,
          fontSize: 13.5,
          color: 'var(--sg-text)'
        }
      }, /*#__PURE__*/React.createElement(Icon, {
        name: "file-text",
        size: 15,
        color: "var(--sg-text-2)"
      }), " Send report to client"), /*#__PURE__*/React.createElement(ActionBtn, {
        icon: "refresh-cw"
      }, "Re-crawl"))
    }), /*#__PURE__*/React.createElement(HealthHero, null), /*#__PURE__*/React.createElement(CoreVitals, null), /*#__PURE__*/React.createElement(IssuesTable, null));
  }
  window.SGSiteAudit = SiteAudit;
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/seo-geo/SGSiteAudit.jsx", error: String((e && e.message) || e) }); }

// ui_kits/seo-geo/SGTopBar.jsx
try { (() => {
// ABC SEO/GEO — sticky top bar. Site/project selector, search, New Audit, bell, avatar.
const {
  Icon
} = window.SGIcons;
function SiteSelector() {
  const [hover, setHover] = React.useState(false);
  return /*#__PURE__*/React.createElement("button", {
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      height: 42,
      padding: '0 12px',
      border: '1px solid var(--sg-border)',
      borderRadius: 'var(--sg-radius-pill)',
      cursor: 'pointer',
      background: hover ? 'var(--sg-sunken)' : 'var(--sg-card)',
      transition: 'background 140ms var(--sg-ease)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 24,
      height: 24,
      borderRadius: 6,
      background: 'var(--sg-grad-brand)',
      flex: 'none',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#fff',
      fontWeight: 700,
      fontSize: 11
    }
  }, "4"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 14,
      fontWeight: 600,
      color: 'var(--sg-text)'
    }
  }, "the4sale.com"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 10.5,
      fontWeight: 700,
      letterSpacing: '0.04em',
      color: 'var(--sg-text-2)',
      background: 'var(--sg-sunken)',
      border: '1px solid var(--sg-border)',
      padding: '2px 7px',
      borderRadius: 'var(--sg-radius-pill)'
    }
  }, "CA"), /*#__PURE__*/React.createElement(Icon, {
    name: "chevron-down",
    size: 16,
    color: "var(--sg-text-2)"
  }));
}
function SGTopBar({
  onToggleSidebar,
  onNewAudit
}) {
  const [btnHover, setBtnHover] = React.useState(false);
  return /*#__PURE__*/React.createElement("header", {
    style: {
      height: 64,
      flex: 'none',
      background: 'rgba(255,255,255,0.86)',
      backdropFilter: 'blur(10px)',
      borderBottom: '1px solid var(--sg-border)',
      display: 'flex',
      alignItems: 'center',
      gap: 14,
      padding: '0 22px',
      position: 'sticky',
      top: 0,
      zIndex: 20
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: onToggleSidebar,
    "aria-label": "Toggle menu",
    style: {
      border: 'none',
      background: 'transparent',
      cursor: 'pointer',
      color: 'var(--sg-text-2)',
      display: 'inline-flex',
      padding: 6,
      borderRadius: 'var(--sg-radius-sm)'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "menu",
    size: 20
  })), /*#__PURE__*/React.createElement(SiteSelector, null), /*#__PURE__*/React.createElement("div", {
    style: {
      marginLeft: 'auto',
      display: 'flex',
      alignItems: 'center',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 9,
      width: 300,
      height: 42,
      padding: '0 14px',
      background: 'var(--sg-sunken)',
      border: '1px solid var(--sg-border)',
      borderRadius: 'var(--sg-radius-pill)'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "search",
    size: 17,
    color: "var(--sg-text-3)"
  }), /*#__PURE__*/React.createElement("input", {
    placeholder: "Search keywords, pages, prompts\u2026",
    style: {
      flex: 1,
      border: 'none',
      outline: 'none',
      background: 'transparent',
      fontFamily: 'var(--sg-font-sans)',
      fontSize: 13.5,
      color: 'var(--sg-text)'
    }
  })), /*#__PURE__*/React.createElement("button", {
    onClick: onNewAudit,
    onMouseEnter: () => setBtnHover(true),
    onMouseLeave: () => setBtnHover(false),
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8,
      height: 42,
      padding: '0 18px',
      border: 'none',
      borderRadius: 'var(--sg-radius-pill)',
      cursor: 'pointer',
      fontFamily: 'var(--sg-font-sans)',
      fontWeight: 700,
      fontSize: 14,
      color: '#fff',
      background: 'var(--sg-grad-brand)',
      boxShadow: btnHover ? '0 6px 18px rgba(37,99,235,0.42)' : '0 3px 10px rgba(37,99,235,0.30)',
      transform: btnHover ? 'translateY(-1px)' : 'none',
      transition: 'all 140ms var(--sg-ease)'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 16
  }), " New Audit"), /*#__PURE__*/React.createElement("button", {
    "aria-label": "Notifications",
    style: {
      position: 'relative',
      width: 42,
      height: 42,
      border: '1px solid var(--sg-border)',
      borderRadius: '50%',
      background: 'var(--sg-card)',
      cursor: 'pointer',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'var(--sg-text-2)'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "bell",
    size: 18
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      top: 9,
      right: 10,
      width: 8,
      height: 8,
      borderRadius: '50%',
      background: 'var(--sg-red)',
      border: '2px solid var(--sg-card)'
    }
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      width: 42,
      height: 42,
      borderRadius: '50%',
      background: 'var(--sg-grad-violet)',
      flex: 'none',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#fff',
      fontWeight: 700,
      fontSize: 14,
      cursor: 'pointer'
    }
  }, "AB")));
}
window.SGTopBar = SGTopBar;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/seo-geo/SGTopBar.jsx", error: String((e && e.message) || e) }); }

// ui_kits/seo-geo/icons.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
// ABC SEO/GEO — Lucide line icons (MIT), 24×24, 2px stroke, round caps.
// Curated subset embedded for offline reliability; same visual language as
// the full Lucide CDN (unpkg.com/lucide). Exported as window.SGIcons.
const SG_ICONS = {
  'layout-dashboard': '<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>',
  'sparkles': '<path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3z"/>',
  'activity': '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
  'key': '<circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6"/><path d="m15.5 7.5 3 3L22 7l-3-3"/>',
  'list-ordered': '<line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/><path d="M4 6h1v4"/><path d="M4 10h2"/><path d="M6 18H4c0-1 2-1.3 2-2.5S5 14 4 14.5"/>',
  'target': '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
  'link': '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
  'file-text': '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z"/><path d="M14 2v5h5"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/>',
  'settings': '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
  'search': '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  'bell': '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
  'plus': '<path d="M5 12h14"/><path d="M12 5v14"/>',
  'chevron-down': '<path d="m6 9 6 6 6-6"/>',
  'chevron-right': '<path d="m9 18 6-6-6-6"/>',
  'chevron-up': '<path d="m18 15-6-6-6 6"/>',
  'check': '<path d="M20 6 9 17l-5-5"/>',
  'trending-up': '<polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>',
  'arrow-up': '<line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>',
  'arrow-down': '<line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/>',
  'arrow-right': '<line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>',
  'minus': '<line x1="5" y1="12" x2="19" y2="12"/>',
  'refresh-cw': '<path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M21 21v-5h-5"/>',
  'external-link': '<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
  'info': '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>',
  'eye': '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>',
  'message-square': '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  'globe': '<circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/><line x1="2" y1="12" x2="22" y2="12"/>',
  'menu': '<line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/>',
  'x': '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  'zap': '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
  'download': '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
  'calendar': '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/>',
  'more-horizontal': '<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>',
  'play': '<polygon points="6 3 20 12 6 21 6 3"/>',
  'help-circle': '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
  'mail': '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
  'clock': '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  'alert-triangle': '<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
  'edit': '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z"/>',
  'send': '<line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>'
};
function SGIcon({
  name,
  size = 20,
  strokeWidth = 2,
  color = 'currentColor',
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("svg", _extends({
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: color,
    strokeWidth: strokeWidth,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    style: {
      flex: 'none',
      ...style
    },
    dangerouslySetInnerHTML: {
      __html: SG_ICONS[name] || ''
    }
  }, rest));
}
window.SGIcons = {
  Icon: SGIcon,
  ICON_NAMES: Object.keys(SG_ICONS)
};
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/seo-geo/icons.jsx", error: String((e && e.message) || e) }); }

// ui_kits/seo-geo/kit.jsx
try { (() => {
// ABC SEO/GEO — shared UI primitives. IIFE-isolated; exposed via window.SGKit.
// Reused across every app screen so cards, gauges, deltas stay consistent.
(function () {
  const {
    Icon
  } = window.SGIcons;
  function Card({
    children,
    style
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        background: 'var(--sg-card)',
        border: '1px solid var(--sg-border)',
        borderRadius: 'var(--sg-radius-lg)',
        boxShadow: 'var(--sg-shadow)',
        ...style
      }
    }, children);
  }
  function CardHead({
    title,
    sub,
    ai,
    right,
    icon
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        padding: '18px 20px 14px',
        borderBottom: '1px solid var(--sg-border)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 8
      }
    }, ai && /*#__PURE__*/React.createElement(Icon, {
      name: "sparkles",
      size: 16,
      color: "var(--sg-violet-600)"
    }), icon && !ai && /*#__PURE__*/React.createElement(Icon, {
      name: icon,
      size: 16,
      color: "var(--sg-text-2)"
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--sg-font-display)',
        fontWeight: 600,
        fontSize: 16,
        color: 'var(--sg-text)'
      }
    }, title)), sub && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12.5,
        color: 'var(--sg-text-2)',
        marginTop: 3
      }
    }, sub)), right);
  }
  function Delta({
    dir,
    children
  }) {
    const map = {
      up: {
        c: 'var(--sg-green)',
        bg: 'var(--sg-green-50)',
        i: 'arrow-up'
      },
      down: {
        c: 'var(--sg-red)',
        bg: 'var(--sg-red-50)',
        i: 'arrow-down'
      },
      flat: {
        c: 'var(--sg-text-2)',
        bg: 'var(--sg-sunken)',
        i: 'minus'
      }
    };
    const m = map[dir] || map.flat;
    return /*#__PURE__*/React.createElement("span", {
      className: "sg-tnum",
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 3,
        fontSize: 12.5,
        fontWeight: 700,
        color: m.c,
        background: m.bg,
        padding: '3px 9px 3px 7px',
        borderRadius: 'var(--sg-radius-pill)',
        whiteSpace: 'nowrap'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: m.i,
      size: 13,
      strokeWidth: 2.6
    }), " ", children);
  }

  // Circular progress ring with a big centered number.
  function Gauge({
    value,
    max = 100,
    color = 'var(--sg-blue-500)',
    size = 150,
    stroke = 13,
    suffix = '/100',
    big
  }) {
    const r = (size - stroke) / 2;
    const C = 2 * Math.PI * r;
    const pct = Math.max(0, Math.min(1, value / max));
    return /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'relative',
        width: size,
        height: size,
        flex: 'none'
      }
    }, /*#__PURE__*/React.createElement("svg", {
      width: size,
      height: size,
      style: {
        transform: 'rotate(-90deg)'
      }
    }, /*#__PURE__*/React.createElement("circle", {
      cx: size / 2,
      cy: size / 2,
      r: r,
      fill: "none",
      stroke: "var(--sg-sunken)",
      strokeWidth: stroke
    }), /*#__PURE__*/React.createElement("circle", {
      cx: size / 2,
      cy: size / 2,
      r: r,
      fill: "none",
      stroke: color,
      strokeWidth: stroke,
      strokeLinecap: "round",
      strokeDasharray: C,
      strokeDashoffset: C * (1 - pct),
      style: {
        transition: 'stroke-dashoffset 0.9s var(--sg-ease)'
      }
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        lineHeight: 1
      }
    }, /*#__PURE__*/React.createElement("span", {
      className: "sg-tnum",
      style: {
        fontFamily: 'var(--sg-font-display)',
        fontWeight: 700,
        fontSize: big || size * 0.3,
        letterSpacing: '-0.02em',
        color: 'var(--sg-text)'
      }
    }, value), suffix && /*#__PURE__*/React.createElement("span", {
      className: "sg-tnum",
      style: {
        fontSize: 12.5,
        fontWeight: 600,
        color: 'var(--sg-text-3)',
        marginTop: 5
      }
    }, suffix)));
  }

  // Tiny sparkline (line + soft fill).
  function Sparkline({
    data,
    color = 'var(--sg-blue-500)',
    w = 88,
    h = 30
  }) {
    const min = Math.min(...data),
      max = Math.max(...data),
      span = max - min || 1;
    const x = i => i * w / (data.length - 1);
    const y = v => h - 3 - (v - min) / span * (h - 6);
    const line = data.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
    const id = 'spk' + Math.random().toString(36).slice(2, 7);
    return /*#__PURE__*/React.createElement("svg", {
      width: w,
      height: h,
      viewBox: `0 0 ${w} ${h}`,
      style: {
        display: 'block',
        overflow: 'visible'
      }
    }, /*#__PURE__*/React.createElement("defs", null, /*#__PURE__*/React.createElement("linearGradient", {
      id: id,
      x1: "0",
      y1: "0",
      x2: "0",
      y2: "1"
    }, /*#__PURE__*/React.createElement("stop", {
      offset: "0%",
      stopColor: color,
      stopOpacity: "0.18"
    }), /*#__PURE__*/React.createElement("stop", {
      offset: "100%",
      stopColor: color,
      stopOpacity: "0"
    }))), /*#__PURE__*/React.createElement("path", {
      d: `${line} L${w},${h} L0,${h} Z`,
      fill: `url(#${id})`
    }), /*#__PURE__*/React.createElement("path", {
      d: line,
      fill: "none",
      stroke: color,
      strokeWidth: "2",
      strokeLinecap: "round",
      strokeLinejoin: "round"
    }));
  }
  function Bar({
    pct,
    color = 'var(--sg-violet-600)',
    track = 'var(--sg-violet-50)',
    height = 8,
    delay = 0
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        height,
        borderRadius: 999,
        background: track,
        overflow: 'hidden'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: pct + '%',
        height: '100%',
        borderRadius: 999,
        background: color,
        transformOrigin: 'left',
        animation: 'sg-grow 0.7s var(--sg-ease) both',
        animationDelay: delay + 's'
      }
    }));
  }

  // Page header used at the top of every screen.
  function PageHead({
    eyebrow,
    eyebrowColor,
    title,
    sub,
    icon,
    iconGrad,
    right
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'flex-end',
        gap: 16,
        flexWrap: 'wrap'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 280
      }
    }, eyebrow && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11.5,
        fontWeight: 700,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        color: eyebrowColor || 'var(--sg-blue-600)',
        marginBottom: 6
      }
    }, eyebrow), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 11
      }
    }, icon && /*#__PURE__*/React.createElement("span", {
      style: {
        width: 38,
        height: 38,
        borderRadius: 11,
        background: iconGrad || 'var(--sg-grad-brand)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 6px 16px rgba(37,99,235,0.30)'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: icon,
      size: 20,
      color: "#fff"
    })), /*#__PURE__*/React.createElement("h1", {
      style: {
        margin: 0,
        fontFamily: 'var(--sg-font-display)',
        fontWeight: 700,
        fontSize: 28,
        letterSpacing: '-0.02em',
        color: 'var(--sg-text)'
      }
    }, title)), sub && /*#__PURE__*/React.createElement("p", {
      style: {
        margin: '10px 0 0',
        fontSize: 14,
        color: 'var(--sg-text-2)',
        maxWidth: 640,
        lineHeight: 1.5
      }
    }, sub)), right && /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 10
      }
    }, right));
  }

  // Date-range pill (visual only).
  function RangeBtn({
    label = 'Last 30 days'
  }) {
    return /*#__PURE__*/React.createElement("button", {
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        height: 42,
        padding: '0 14px',
        border: '1px solid var(--sg-border)',
        borderRadius: 'var(--sg-radius-pill)',
        background: 'var(--sg-card)',
        cursor: 'pointer',
        fontFamily: 'var(--sg-font-sans)',
        fontSize: 13.5,
        fontWeight: 600,
        color: 'var(--sg-text)'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "calendar",
      size: 16,
      color: "var(--sg-text-2)"
    }), " ", label, " ", /*#__PURE__*/React.createElement(Icon, {
      name: "chevron-down",
      size: 15,
      color: "var(--sg-text-2)"
    }));
  }
  function ActionBtn({
    children,
    icon,
    grad = 'var(--sg-grad-brand)',
    onClick
  }) {
    const [h, setH] = React.useState(false);
    return /*#__PURE__*/React.createElement("button", {
      onClick: onClick,
      onMouseEnter: () => setH(true),
      onMouseLeave: () => setH(false),
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        height: 42,
        padding: '0 18px',
        border: 'none',
        borderRadius: 'var(--sg-radius-pill)',
        cursor: 'pointer',
        fontFamily: 'var(--sg-font-sans)',
        fontWeight: 700,
        fontSize: 14,
        color: '#fff',
        background: grad,
        boxShadow: h ? '0 6px 18px rgba(37,99,235,0.40)' : '0 3px 10px rgba(37,99,235,0.26)',
        transform: h ? 'translateY(-1px)' : 'none',
        transition: 'all 140ms var(--sg-ease)'
      }
    }, icon && /*#__PURE__*/React.createElement(Icon, {
      name: icon,
      size: 16
    }), " ", children);
  }
  window.SGKit = {
    Card,
    CardHead,
    Delta,
    Gauge,
    Sparkline,
    Bar,
    PageHead,
    RangeBtn,
    ActionBtn
  };
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/seo-geo/kit.jsx", error: String((e && e.message) || e) }); }

// ui_kits/web-app/App.jsx
try { (() => {
// App shell — composes sidebar, top bar, routed screens, and overlays.
const {
  Icon
} = window.ABCIcons;
const {
  Button,
  Input,
  Select,
  Avatar,
  Badge
} = window.AIBizConnectDesignSystem_d948fa;
function Placeholder({
  icon,
  title,
  body
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 14,
      padding: '70px 20px',
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 60,
      height: 60,
      borderRadius: 'var(--radius-xl)',
      background: 'var(--blue-50)',
      color: 'var(--color-primary)',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: icon,
    size: 28
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 600,
      fontSize: 20,
      color: 'var(--text-heading)'
    }
  }, title), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      color: 'var(--text-muted)',
      maxWidth: 380,
      lineHeight: 1.5
    }
  }, body), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    leftIcon: /*#__PURE__*/React.createElement(Icon, {
      name: "plus",
      size: 16
    }),
    style: {
      marginTop: 4
    }
  }, "Get started"));
}
function NewContactModal({
  open,
  onClose
}) {
  if (!open) return null;
  return /*#__PURE__*/React.createElement("div", {
    onClick: onClose,
    style: {
      position: 'fixed',
      inset: 0,
      background: 'rgba(12,14,40,0.45)',
      backdropFilter: 'blur(2px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 50,
      padding: 20,
      animation: 'abc-fade 0.18s ease-out'
    }
  }, /*#__PURE__*/React.createElement("div", {
    onClick: e => e.stopPropagation(),
    style: {
      width: 460,
      maxWidth: '100%',
      background: 'var(--surface-card)',
      borderRadius: 'var(--radius-xl)',
      boxShadow: 'var(--shadow-xl)',
      overflow: 'hidden',
      animation: 'abc-pop 0.22s var(--ease-spring)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '20px 22px',
      borderBottom: '1px solid var(--border-subtle)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 600,
      fontSize: 18,
      color: 'var(--text-heading)'
    }
  }, "New contact"), /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    "aria-label": "Close",
    style: {
      border: 'none',
      background: 'transparent',
      cursor: 'pointer',
      color: 'var(--text-muted)',
      display: 'inline-flex'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "x",
    size: 20
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 22,
      display: 'flex',
      flexDirection: 'column',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 14
    }
  }, /*#__PURE__*/React.createElement(Input, {
    label: "First name",
    placeholder: "Jane"
  }), /*#__PURE__*/React.createElement(Input, {
    label: "Last name",
    placeholder: "Doe"
  })), /*#__PURE__*/React.createElement(Input, {
    label: "Work email",
    placeholder: "jane@company.com",
    leftIcon: /*#__PURE__*/React.createElement(Icon, {
      name: "mail",
      size: 16
    })
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 14
    }
  }, /*#__PURE__*/React.createElement(Input, {
    label: "Company",
    placeholder: "Acme LLC"
  }), /*#__PURE__*/React.createElement(Select, {
    label: "Stage",
    defaultValue: "new"
  }, /*#__PURE__*/React.createElement("option", {
    value: "new"
  }, "New"), /*#__PURE__*/React.createElement("option", {
    value: "qualified"
  }, "Qualified"), /*#__PURE__*/React.createElement("option", {
    value: "proposal"
  }, "Proposal")))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'flex-end',
      gap: 10,
      padding: '16px 22px',
      borderTop: '1px solid var(--border-subtle)',
      background: 'var(--gray-50)'
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    onClick: onClose
  }, "Cancel"), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    onClick: onClose
  }, "Add contact"))));
}
function ContactDrawer({
  contact,
  onClose
}) {
  if (!contact) return null;
  return /*#__PURE__*/React.createElement("div", {
    onClick: onClose,
    style: {
      position: 'fixed',
      inset: 0,
      background: 'rgba(12,14,40,0.45)',
      backdropFilter: 'blur(2px)',
      display: 'flex',
      justifyContent: 'flex-end',
      zIndex: 50,
      animation: 'abc-fade 0.18s ease-out'
    }
  }, /*#__PURE__*/React.createElement("div", {
    onClick: e => e.stopPropagation(),
    style: {
      width: 420,
      maxWidth: '100%',
      height: '100%',
      background: 'var(--surface-card)',
      boxShadow: 'var(--shadow-xl)',
      display: 'flex',
      flexDirection: 'column',
      animation: 'abc-slide 0.26s var(--ease-out)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 22,
      background: 'var(--navy-900)',
      color: 'var(--white)',
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    "aria-label": "Close",
    style: {
      position: 'absolute',
      top: 16,
      right: 16,
      border: 'none',
      background: 'rgba(255,255,255,0.12)',
      borderRadius: 'var(--radius-sm)',
      cursor: 'pointer',
      color: 'var(--white)',
      display: 'inline-flex',
      padding: 6
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "x",
    size: 18
  })), /*#__PURE__*/React.createElement(Avatar, {
    name: contact.name,
    size: "xl"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 600,
      fontSize: 22,
      marginTop: 12
    }
  }, contact.name), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      color: 'rgba(255,255,255,0.7)',
      marginTop: 2
    }
  }, contact.org), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      marginTop: 14
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "sm",
    leftIcon: /*#__PURE__*/React.createElement(Icon, {
      name: "mail",
      size: 15
    })
  }, "Email"), /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    size: "sm",
    leftIcon: /*#__PURE__*/React.createElement(Icon, {
      name: "phone",
      size: 15
    })
  }, "Call"), /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    size: "sm",
    leftIcon: /*#__PURE__*/React.createElement(Icon, {
      name: "calendar",
      size: 15
    })
  }, "Book"))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 22,
      display: 'flex',
      flexDirection: 'column',
      gap: 18,
      overflow: 'auto'
    }
  }, /*#__PURE__*/React.createElement(Field, {
    label: "Deal value",
    value: contact.value,
    mono: true
  }), /*#__PURE__*/React.createElement(Field, {
    label: "Email",
    value: contact.email
  }), /*#__PURE__*/React.createElement(Field, {
    label: "Owner",
    value: contact.owner
  }), /*#__PURE__*/React.createElement(Field, {
    label: "Industry",
    value: contact.tag
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      fontWeight: 700,
      letterSpacing: '0.04em',
      textTransform: 'uppercase',
      color: 'var(--text-muted)',
      marginBottom: 10
    }
  }, "Recent activity"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 12
    }
  }, ['Opened proposal · 40m ago', 'Email replied · 2d ago', 'Call logged · 5d ago'].map((t, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: 'flex',
      gap: 10,
      fontSize: 13.5,
      color: 'var(--text-body)',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 7,
      height: 7,
      borderRadius: '50%',
      background: 'var(--blue-400)',
      flex: 'none'
    }
  }), t)))))));
}
function Field({
  label,
  value,
  mono
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderBottom: '1px solid var(--border-subtle)',
      paddingBottom: 12
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      color: 'var(--text-muted)'
    }
  }, label), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 14,
      fontWeight: 600,
      color: 'var(--text-strong)',
      fontFamily: mono ? 'var(--font-mono)' : 'inherit'
    }
  }, value));
}
function App() {
  const [route, setRoute] = React.useState('dashboard');
  const [collapsed, setCollapsed] = React.useState(false);
  const [modal, setModal] = React.useState(false);
  const [contact, setContact] = React.useState(null);
  let screen;
  if (route === 'dashboard') screen = /*#__PURE__*/React.createElement(window.ABCDashboard, null);else if (route === 'contacts') screen = /*#__PURE__*/React.createElement(window.ABCContacts, {
    onOpen: setContact
  });else if (route === 'pipeline') screen = /*#__PURE__*/React.createElement(window.ABCPipeline, null);else if (route === 'marketing') screen = /*#__PURE__*/React.createElement(Placeholder, {
    icon: "megaphone",
    title: "Marketing campaigns",
    body: "Build email & SMS sequences, broadcasts, and automations that nurture every lead on autopilot."
  });else if (route === 'website') screen = /*#__PURE__*/React.createElement(Placeholder, {
    icon: "globe",
    title: "Website builder",
    body: "Launch a branded site and booking pages in minutes \u2014 no code, fully connected to your CRM."
  });else screen = /*#__PURE__*/React.createElement(Placeholder, {
    icon: "bar-chart",
    title: "Analytics",
    body: "Track pipeline velocity, campaign ROI, and revenue trends across your whole book of business."
  });
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      height: '100vh',
      overflow: 'hidden',
      background: 'var(--surface-page)'
    }
  }, /*#__PURE__*/React.createElement(window.ABCSidebar, {
    active: route,
    onNavigate: setRoute,
    collapsed: collapsed
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement(window.ABCTopBar, {
    active: route,
    onToggleSidebar: () => setCollapsed(c => !c),
    onNewContact: () => setModal(true)
  }), /*#__PURE__*/React.createElement("main", {
    style: {
      flex: 1,
      overflow: 'auto',
      padding: 24
    }
  }, screen)), /*#__PURE__*/React.createElement(NewContactModal, {
    open: modal,
    onClose: () => setModal(false)
  }), /*#__PURE__*/React.createElement(ContactDrawer, {
    contact: contact,
    onClose: () => setContact(null)
  }));
}
window.ABCApp = App;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/web-app/App.jsx", error: String((e && e.message) || e) }); }

// ui_kits/web-app/Contacts.jsx
try { (() => {
// Contacts screen — searchable/filterable table of leads & clients.
const {
  Icon
} = window.ABCIcons;
const {
  Tabs,
  Badge,
  Avatar,
  Button,
  Input
} = window.AIBizConnectDesignSystem_d948fa;
const CONTACTS = [{
  name: 'Marcus Lee',
  org: 'Lee & Co. Realty',
  email: 'marcus@leeco.com',
  stage: 'qualified',
  value: '$8,400',
  owner: 'Dana',
  tag: 'Real estate'
}, {
  name: 'Acme Insurance',
  org: 'Acme Insurance Group',
  email: 'hello@acme-ins.com',
  stage: 'proposal',
  value: '$22,000',
  owner: 'Dana',
  tag: 'Insurance'
}, {
  name: 'Priya Nair',
  org: 'Nair Advisory',
  email: 'priya@nairadvisory.io',
  stage: 'won',
  value: '$14,200',
  owner: 'Sam',
  tag: 'Advisor'
}, {
  name: 'J. Whitfield',
  org: 'Whitfield Law',
  email: 'jw@whitfieldlaw.com',
  stage: 'new',
  value: '$5,000',
  owner: 'Dana',
  tag: 'Legal'
}, {
  name: 'Sunrise Dental',
  org: 'Sunrise Dental PC',
  email: 'office@sunrise.dental',
  stage: 'qualified',
  value: '$9,800',
  owner: 'Sam',
  tag: 'Healthcare'
}, {
  name: 'Octavia Brooks',
  org: 'Brooks Financial',
  email: 'octavia@brooksfin.com',
  stage: 'negotiation',
  value: '$31,000',
  owner: 'Dana',
  tag: 'Advisor'
}, {
  name: 'Northwind LLC',
  org: 'Northwind Holdings',
  email: 'team@northwind.co',
  stage: 'new',
  value: '$3,200',
  owner: 'Sam',
  tag: 'Other'
}];
const STAGE_TONE = {
  new: 'neutral',
  qualified: 'brand',
  proposal: 'warning',
  negotiation: 'warning',
  won: 'success'
};
const STAGE_LABEL = {
  new: 'New',
  qualified: 'Qualified',
  proposal: 'Proposal',
  negotiation: 'Negotiation',
  won: 'Won'
};
function Contacts({
  onOpen
}) {
  const [view, setView] = React.useState('all');
  const [q, setQ] = React.useState('');
  const rows = CONTACTS.filter(c => (view === 'all' || (view === 'clients' ? c.stage === 'won' : c.stage !== 'won')) && (c.name.toLowerCase().includes(q.toLowerCase()) || c.org.toLowerCase().includes(q.toLowerCase())));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement(Tabs, {
    value: view,
    onChange: setView,
    tabs: [{
      value: 'all',
      label: 'All',
      count: 248
    }, {
      value: 'leads',
      label: 'Leads',
      count: 234
    }, {
      value: 'clients',
      label: 'Clients',
      count: 14
    }]
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      marginLeft: 'auto',
      width: 240
    }
  }, /*#__PURE__*/React.createElement(Input, {
    placeholder: "Search contacts",
    value: q,
    onChange: e => setQ(e.target.value),
    leftIcon: /*#__PURE__*/React.createElement(Icon, {
      name: "search",
      size: 16
    })
  })), /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    leftIcon: /*#__PURE__*/React.createElement(Icon, {
      name: "filter",
      size: 16
    })
  }, "Filter")), /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--surface-card)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-lg)',
      boxShadow: 'var(--shadow-sm)',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '2.2fr 1.4fr 1fr 1fr 40px',
      gap: 12,
      padding: '12px 18px',
      borderBottom: '1px solid var(--border-subtle)',
      background: 'var(--gray-50)',
      fontSize: 12,
      fontWeight: 700,
      letterSpacing: '0.04em',
      textTransform: 'uppercase',
      color: 'var(--text-muted)'
    }
  }, /*#__PURE__*/React.createElement("div", null, "Contact"), /*#__PURE__*/React.createElement("div", null, "Stage"), /*#__PURE__*/React.createElement("div", null, "Owner"), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'right'
    }
  }, "Value"), /*#__PURE__*/React.createElement("div", null)), rows.map((c, i) => /*#__PURE__*/React.createElement(Row, {
    key: c.email,
    c: c,
    last: i === rows.length - 1,
    onOpen: () => onOpen?.(c)
  })), rows.length === 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 40,
      textAlign: 'center',
      color: 'var(--text-muted)',
      fontSize: 14
    }
  }, "No contacts match \"", q, "\".")));
}
function Row({
  c,
  last,
  onOpen
}) {
  const [hover, setHover] = React.useState(false);
  return /*#__PURE__*/React.createElement("div", {
    onClick: onOpen,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      display: 'grid',
      gridTemplateColumns: '2.2fr 1.4fr 1fr 1fr 40px',
      gap: 12,
      padding: '13px 18px',
      alignItems: 'center',
      borderBottom: last ? 'none' : '1px solid var(--border-subtle)',
      cursor: 'pointer',
      background: hover ? 'var(--gray-50)' : 'transparent'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement(Avatar, {
    name: c.name,
    size: "md"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      fontWeight: 600,
      color: 'var(--text-strong)',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  }, c.name), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12.5,
      color: 'var(--text-muted)',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  }, c.org))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Badge, {
    tone: STAGE_TONE[c.stage],
    dot: true
  }, STAGE_LABEL[c.stage])), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 7,
      fontSize: 13.5,
      color: 'var(--text-body)'
    }
  }, /*#__PURE__*/React.createElement(Avatar, {
    name: c.owner,
    size: "xs"
  }), " ", c.owner), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'right',
      fontFamily: 'var(--font-mono)',
      fontSize: 13.5,
      fontWeight: 500,
      color: 'var(--text-strong)'
    }
  }, c.value), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'flex-end',
      color: 'var(--text-muted)'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "chevron-right",
    size: 17
  })));
}
window.ABCContacts = Contacts;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/web-app/Contacts.jsx", error: String((e && e.message) || e) }); }

// ui_kits/web-app/Dashboard.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
// Dashboard screen — overview KPIs, pipeline-by-stage, activity feed & tasks.
const {
  Icon
} = window.ABCIcons;
const {
  Stat,
  Card,
  CardHeader,
  Badge,
  Avatar,
  Button
} = window.AIBizConnectDesignSystem_d948fa;
const STATS = [{
  label: 'Pipeline value',
  value: '$48,920',
  delta: '12.4%',
  icon: 'dollar-sign'
}, {
  label: 'New leads',
  value: '327',
  delta: '8.1%',
  icon: 'users'
}, {
  label: 'Win rate',
  value: '34%',
  delta: '3.2%',
  icon: 'trending-up'
}, {
  label: 'Tasks due',
  value: '9',
  delta: '-2',
  icon: 'clock'
}];
const STAGES = [{
  name: 'New',
  count: 86,
  value: '$112k',
  pct: 100,
  color: 'var(--blue-300)'
}, {
  name: 'Qualified',
  count: 41,
  value: '$78k',
  pct: 64,
  color: 'var(--blue-400)'
}, {
  name: 'Proposal',
  count: 18,
  value: '$49k',
  pct: 38,
  color: 'var(--blue-500)'
}, {
  name: 'Negotiation',
  count: 9,
  value: '$31k',
  pct: 22,
  color: 'var(--blue-600)'
}, {
  name: 'Won',
  count: 14,
  value: '$24k',
  pct: 30,
  color: 'var(--green-500)'
}];
const ACTIVITY = [{
  who: 'Marcus Lee',
  what: 'booked a discovery call',
  when: '12m ago',
  tone: 'brand',
  icon: 'calendar'
}, {
  who: 'Acme Insurance',
  what: 'opened your proposal',
  when: '40m ago',
  tone: 'neutral',
  icon: 'file-text'
}, {
  who: 'Priya Nair',
  what: 'replied to "Q2 follow-up"',
  when: '1h ago',
  tone: 'success',
  icon: 'mail'
}, {
  who: 'New lead',
  what: 'submitted the contact form',
  when: '2h ago',
  tone: 'brand',
  icon: 'inbox'
}];
const TASKS = [{
  t: 'Call back J. Whitfield re: policy renewal',
  due: 'Today · 2:00 PM',
  done: false
}, {
  t: 'Send proposal to Acme Insurance',
  due: 'Today · 4:30 PM',
  done: false
}, {
  t: 'Follow up with 3 stale leads',
  due: 'Tomorrow',
  done: false
}, {
  t: 'Review weekly campaign report',
  due: 'Done',
  done: true
}];
function StageBar({
  s
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 92,
      fontSize: 13,
      fontWeight: 600,
      color: 'var(--text-strong)'
    }
  }, s.name), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      height: 28,
      background: 'var(--gray-100)',
      borderRadius: 'var(--radius-sm)',
      overflow: 'hidden',
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: s.pct + '%',
      height: '100%',
      background: s.color,
      borderRadius: 'var(--radius-sm)',
      display: 'flex',
      alignItems: 'center',
      paddingLeft: 10
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      fontWeight: 700,
      color: 'var(--white)'
    }
  }, s.count))), /*#__PURE__*/React.createElement("div", {
    style: {
      width: 56,
      textAlign: 'right',
      fontFamily: 'var(--font-mono)',
      fontSize: 13,
      color: 'var(--text-body)'
    }
  }, s.value));
}
function Dashboard() {
  const [tasks, setTasks] = React.useState(TASKS);
  const toggle = i => setTasks(t => t.map((x, j) => j === i ? {
    ...x,
    done: !x.done
  } : x));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'space-between'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 600,
      fontSize: 26,
      color: 'var(--text-heading)',
      letterSpacing: '-0.02em'
    }
  }, "Good morning, Dana \uD83D\uDC4B"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      color: 'var(--text-muted)',
      marginTop: 4
    }
  }, "Here's what's happening across your book of business today.")), /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    leftIcon: /*#__PURE__*/React.createElement(Icon, {
      name: "calendar",
      size: 16
    })
  }, "This month")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(4,1fr)',
      gap: 16
    }
  }, STATS.map(s => /*#__PURE__*/React.createElement(Card, {
    key: s.label,
    padding: "md"
  }, /*#__PURE__*/React.createElement(Stat, _extends({}, s, {
    icon: /*#__PURE__*/React.createElement(Icon, {
      name: s.icon,
      size: 16
    })
  }))))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1.5fr 1fr',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement(Card, {
    padding: "md"
  }, /*#__PURE__*/React.createElement(CardHeader, {
    title: "Pipeline by stage",
    subtitle: "Weighted value \xB7 this quarter",
    action: /*#__PURE__*/React.createElement(Badge, {
      tone: "brand"
    }, "$294k total")
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 12
    }
  }, STAGES.map(s => /*#__PURE__*/React.createElement(StageBar, {
    key: s.name,
    s: s
  })))), /*#__PURE__*/React.createElement(Card, {
    padding: "md"
  }, /*#__PURE__*/React.createElement(CardHeader, {
    title: "Activity",
    action: /*#__PURE__*/React.createElement("a", {
      href: "#",
      style: {
        fontSize: 13,
        fontWeight: 600
      }
    }, "View all")
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 14
    }
  }, ACTIVITY.map((a, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: 'flex',
      gap: 11,
      alignItems: 'flex-start'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 32,
      height: 32,
      flex: 'none',
      borderRadius: 'var(--radius-md)',
      background: 'var(--blue-50)',
      color: 'var(--color-primary)',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: a.icon,
    size: 15
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      fontSize: 13.5,
      lineHeight: 1.45,
      color: 'var(--text-body)'
    }
  }, /*#__PURE__*/React.createElement("b", {
    style: {
      color: 'var(--text-strong)'
    }
  }, a.who), " ", a.what, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: 'var(--text-muted)',
      marginTop: 1
    }
  }, a.when))))))), /*#__PURE__*/React.createElement(Card, {
    padding: "md"
  }, /*#__PURE__*/React.createElement(CardHeader, {
    title: "Today's tasks",
    subtitle: `${tasks.filter(t => !t.done).length} remaining`,
    action: /*#__PURE__*/React.createElement(Button, {
      variant: "ghost",
      size: "sm",
      leftIcon: /*#__PURE__*/React.createElement(Icon, {
        name: "plus",
        size: 15
      })
    }, "Add task")
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column'
    }
  }, tasks.map((t, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    onClick: () => toggle(i),
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '11px 0',
      borderTop: i ? '1px solid var(--border-subtle)' : 'none',
      cursor: 'pointer'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 20,
      height: 20,
      flex: 'none',
      borderRadius: 'var(--radius-xs)',
      border: `1.5px solid ${t.done ? 'var(--color-primary)' : 'var(--border-strong)'}`,
      background: t.done ? 'var(--color-primary)' : 'transparent',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, t.done && /*#__PURE__*/React.createElement(Icon, {
    name: "check",
    size: 13,
    color: "white",
    strokeWidth: 3
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      fontSize: 14,
      color: t.done ? 'var(--text-muted)' : 'var(--text-strong)',
      textDecoration: t.done ? 'line-through' : 'none'
    }
  }, t.t), /*#__PURE__*/React.createElement(Badge, {
    tone: t.done ? 'success' : 'neutral'
  }, t.due))))));
}
window.ABCDashboard = Dashboard;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/web-app/Dashboard.jsx", error: String((e && e.message) || e) }); }

// ui_kits/web-app/Pipeline.jsx
try { (() => {
// Pipeline screen — kanban board of deals across stages.
const {
  Icon
} = window.ABCIcons;
const {
  Badge,
  Avatar,
  Button
} = window.AIBizConnectDesignSystem_d948fa;
const COLUMNS = [{
  id: 'new',
  name: 'New',
  accent: 'var(--blue-300)',
  deals: [{
    org: 'Whitfield Law',
    value: '$5,000',
    owner: 'Dana',
    days: 2
  }, {
    org: 'Northwind LLC',
    value: '$3,200',
    owner: 'Sam',
    days: 1
  }, {
    org: 'Cedar Realty',
    value: '$6,800',
    owner: 'Dana',
    days: 4
  }]
}, {
  id: 'qualified',
  name: 'Qualified',
  accent: 'var(--blue-400)',
  deals: [{
    org: 'Lee & Co. Realty',
    value: '$8,400',
    owner: 'Dana',
    days: 3
  }, {
    org: 'Sunrise Dental',
    value: '$9,800',
    owner: 'Sam',
    days: 6
  }]
}, {
  id: 'proposal',
  name: 'Proposal',
  accent: 'var(--blue-500)',
  deals: [{
    org: 'Acme Insurance',
    value: '$22,000',
    owner: 'Dana',
    days: 5,
    hot: true
  }]
}, {
  id: 'negotiation',
  name: 'Negotiation',
  accent: 'var(--blue-600)',
  deals: [{
    org: 'Brooks Financial',
    value: '$31,000',
    owner: 'Dana',
    days: 8,
    hot: true
  }]
}, {
  id: 'won',
  name: 'Won',
  accent: 'var(--green-500)',
  deals: [{
    org: 'Nair Advisory',
    value: '$14,200',
    owner: 'Sam',
    days: 0
  }]
}];
function DealCard({
  d
}) {
  const [hover, setHover] = React.useState(false);
  return /*#__PURE__*/React.createElement("div", {
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      background: 'var(--surface-card)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-md)',
      padding: 13,
      boxShadow: hover ? 'var(--shadow-md)' : 'var(--shadow-xs)',
      cursor: 'grab',
      transform: hover ? 'translateY(-1px)' : 'none',
      transition: 'box-shadow var(--dur-fast) var(--ease-out), transform var(--dur-fast) var(--ease-out)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      fontWeight: 600,
      color: 'var(--text-strong)'
    }
  }, d.org), d.hot && /*#__PURE__*/React.createElement(Badge, {
    tone: "warning",
    dot: true
  }, "Hot")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 16,
      fontWeight: 600,
      color: 'var(--color-primary)',
      margin: '8px 0 10px'
    }
  }, d.value), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      fontSize: 12.5,
      color: 'var(--text-muted)'
    }
  }, /*#__PURE__*/React.createElement(Avatar, {
    name: d.owner,
    size: "xs"
  }), " ", d.owner), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 4,
      fontSize: 12,
      color: d.days > 5 ? 'var(--amber-600)' : 'var(--text-muted)'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "clock",
    size: 13
  }), " ", d.days === 0 ? 'today' : `${d.days}d`)));
}
function Pipeline() {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 16,
      height: '100%'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      color: 'var(--text-muted)'
    }
  }, "8 active deals \xB7 ", /*#__PURE__*/React.createElement("b", {
    style: {
      color: 'var(--text-strong)'
    }
  }, "$294k"), " weighted pipeline"), /*#__PURE__*/React.createElement("div", {
    style: {
      marginLeft: 'auto',
      display: 'flex',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    size: "md",
    leftIcon: /*#__PURE__*/React.createElement(Icon, {
      name: "filter",
      size: 16
    })
  }, "Filter"), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "md",
    leftIcon: /*#__PURE__*/React.createElement(Icon, {
      name: "plus",
      size: 16
    })
  }, "New deal"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(5,1fr)',
      gap: 14,
      alignItems: 'start',
      flex: 1,
      overflow: 'auto'
    }
  }, COLUMNS.map(col => /*#__PURE__*/React.createElement("div", {
    key: col.id,
    style: {
      background: 'var(--gray-50)',
      borderRadius: 'var(--radius-lg)',
      padding: 10,
      display: 'flex',
      flexDirection: 'column',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '4px 4px 2px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 8,
      height: 8,
      borderRadius: '50%',
      background: col.accent
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      fontWeight: 700,
      color: 'var(--text-strong)'
    }
  }, col.name), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      fontWeight: 600,
      color: 'var(--text-muted)',
      marginLeft: 'auto'
    }
  }, col.deals.length)), col.deals.map((d, i) => /*#__PURE__*/React.createElement(DealCard, {
    key: i,
    d: d
  })), /*#__PURE__*/React.createElement("button", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      height: 36,
      border: '1.5px dashed var(--border-default)',
      borderRadius: 'var(--radius-md)',
      background: 'transparent',
      color: 'var(--text-muted)',
      fontFamily: 'var(--font-sans)',
      fontSize: 13,
      fontWeight: 600,
      cursor: 'pointer'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 15
  }), " Add")))));
}
window.ABCPipeline = Pipeline;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/web-app/Pipeline.jsx", error: String((e && e.message) || e) }); }

// ui_kits/web-app/Sidebar.jsx
try { (() => {
// Sidebar navigation for the ABC SalesMaster web app.
const {
  Icon
} = window.ABCIcons;
const NAV = [{
  id: 'dashboard',
  label: 'Dashboard',
  icon: 'layout-dashboard'
}, {
  id: 'contacts',
  label: 'Contacts',
  icon: 'users',
  badge: '248'
}, {
  id: 'pipeline',
  label: 'Pipeline',
  icon: 'git-branch'
}, {
  id: 'marketing',
  label: 'Marketing',
  icon: 'megaphone'
}, {
  id: 'website',
  label: 'Website',
  icon: 'globe'
}, {
  id: 'analytics',
  label: 'Analytics',
  icon: 'bar-chart'
}];
function NavItem({
  item,
  active,
  onClick
}) {
  const [hover, setHover] = React.useState(false);
  return /*#__PURE__*/React.createElement("button", {
    onClick: onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 11,
      width: '100%',
      padding: '0 12px',
      height: 42,
      border: 'none',
      borderRadius: 'var(--radius-md)',
      cursor: 'pointer',
      textAlign: 'left',
      fontFamily: 'var(--font-sans)',
      fontSize: 'var(--text-sm)',
      fontWeight: 'var(--weight-semibold)',
      background: active ? 'var(--blue-50)' : hover ? 'var(--gray-50)' : 'transparent',
      color: active ? 'var(--color-primary)' : 'var(--text-body)',
      transition: 'background var(--dur-fast) var(--ease-out)'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: item.icon,
    size: 19,
    strokeWidth: active ? 2.3 : 2
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1
    }
  }, item.label), item.badge && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      fontWeight: 700,
      color: active ? 'var(--color-primary)' : 'var(--text-muted)',
      background: active ? 'var(--white)' : 'var(--gray-100)',
      padding: '2px 7px',
      borderRadius: 'var(--radius-pill)'
    }
  }, item.badge));
}
function Sidebar({
  active,
  onNavigate,
  collapsed
}) {
  return /*#__PURE__*/React.createElement("aside", {
    style: {
      width: collapsed ? 0 : 244,
      flex: 'none',
      background: 'var(--surface-card)',
      borderRight: '1px solid var(--border-subtle)',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      transition: 'width var(--dur-base) var(--ease-out)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '20px 18px 14px',
      display: 'flex',
      alignItems: 'center',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/logo-mark.png",
    alt: "ABC",
    style: {
      width: 30,
      height: 30
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 600,
      fontSize: 17,
      color: 'var(--navy-900)',
      letterSpacing: '-0.01em'
    }
  }, "ABC ", /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--gray-500)',
      fontWeight: 600
    }
  }, "SalesMaster"))), /*#__PURE__*/React.createElement("nav", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 3,
      padding: '6px 12px'
    }
  }, NAV.map(n => /*#__PURE__*/React.createElement(NavItem, {
    key: n.id,
    item: n,
    active: active === n.id,
    onClick: () => onNavigate(n.id)
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 'auto',
      padding: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--navy-900)',
      borderRadius: 'var(--radius-lg)',
      padding: 16,
      color: 'var(--white)',
      position: 'relative',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      right: -18,
      top: -18,
      width: 70,
      height: 70,
      borderRadius: '50%',
      background: 'rgba(85,95,196,0.4)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "sparkles",
    size: 16,
    color: "var(--blue-300)"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      fontWeight: 700,
      letterSpacing: '0.04em',
      textTransform: 'uppercase',
      color: 'var(--blue-200)'
    }
  }, "Pro tip")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      lineHeight: 1.5,
      color: 'rgba(255,255,255,0.85)',
      marginBottom: 12,
      position: 'relative'
    }
  }, "Automate follow-ups and recover 8+ hours a week."), /*#__PURE__*/React.createElement("button", {
    style: {
      width: '100%',
      height: 34,
      border: 'none',
      borderRadius: 'var(--radius-sm)',
      background: 'var(--white)',
      color: 'var(--navy-900)',
      fontFamily: 'var(--font-sans)',
      fontWeight: 700,
      fontSize: 13,
      cursor: 'pointer'
    }
  }, "Set up automations"))));
}
window.ABCSidebar = Sidebar;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/web-app/Sidebar.jsx", error: String((e && e.message) || e) }); }

// ui_kits/web-app/TopBar.jsx
try { (() => {
// Top bar with search, quick actions, notifications and account.
const {
  Icon
} = window.ABCIcons;
const {
  Avatar,
  Button
} = window.AIBizConnectDesignSystem_d948fa;
const TITLES = {
  dashboard: 'Dashboard',
  contacts: 'Contacts',
  pipeline: 'Pipeline',
  marketing: 'Marketing',
  website: 'Website',
  analytics: 'Analytics'
};
function TopBar({
  active,
  onToggleSidebar,
  onNewContact
}) {
  return /*#__PURE__*/React.createElement("header", {
    style: {
      height: 64,
      flex: 'none',
      background: 'var(--surface-card)',
      borderBottom: '1px solid var(--border-subtle)',
      display: 'flex',
      alignItems: 'center',
      gap: 16,
      padding: '0 22px'
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: onToggleSidebar,
    "aria-label": "Toggle menu",
    style: {
      border: 'none',
      background: 'transparent',
      cursor: 'pointer',
      color: 'var(--text-body)',
      display: 'inline-flex',
      padding: 6,
      borderRadius: 'var(--radius-sm)'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "menu",
    size: 20
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 600,
      fontSize: 20,
      color: 'var(--text-heading)',
      letterSpacing: '-0.02em'
    }
  }, TITLES[active]), /*#__PURE__*/React.createElement("div", {
    style: {
      marginLeft: 'auto',
      display: 'flex',
      alignItems: 'center',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      width: 280,
      height: 40,
      padding: '0 12px',
      background: 'var(--gray-50)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-md)'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "search",
    size: 17,
    color: "var(--text-muted)"
  }), /*#__PURE__*/React.createElement("input", {
    placeholder: "Search contacts, deals\u2026",
    style: {
      flex: 1,
      border: 'none',
      outline: 'none',
      background: 'transparent',
      fontFamily: 'var(--font-sans)',
      fontSize: 14,
      color: 'var(--text-strong)'
    }
  }), /*#__PURE__*/React.createElement("kbd", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 11,
      color: 'var(--text-muted)',
      background: 'var(--white)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 4,
      padding: '1px 5px'
    }
  }, "\u2318K")), /*#__PURE__*/React.createElement("button", {
    "aria-label": "Notifications",
    style: {
      position: 'relative',
      width: 40,
      height: 40,
      border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-md)',
      background: 'var(--surface-card)',
      cursor: 'pointer',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'var(--text-body)'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "bell",
    size: 18
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      top: 8,
      right: 9,
      width: 8,
      height: 8,
      borderRadius: '50%',
      background: 'var(--danger)',
      border: '2px solid var(--surface-card)'
    }
  })), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "md",
    leftIcon: /*#__PURE__*/React.createElement(Icon, {
      name: "plus",
      size: 16
    }),
    onClick: onNewContact
  }, "New contact"), /*#__PURE__*/React.createElement(Avatar, {
    name: "Dana Ruiz",
    size: "md",
    status: "online"
  })));
}
window.ABCTopBar = TopBar;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/web-app/TopBar.jsx", error: String((e && e.message) || e) }); }

// ui_kits/web-app/icons.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
// AIBizConnect icon set — Lucide line icons (MIT), 24×24, 2px stroke, round caps.
// A curated subset is embedded for offline reliability; swap in the full Lucide
// CDN (unpkg.com/lucide) to access the complete library with the same look.
const ICONS = {
  'layout-dashboard': '<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>',
  'users': '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  'git-branch': '<line x1="6" y1="3" x2="6" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/>',
  'megaphone': '<path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>',
  'globe': '<circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/><line x1="2" y1="12" x2="22" y2="12"/>',
  'bar-chart': '<path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/>',
  'settings': '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
  'search': '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  'bell': '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
  'plus': '<path d="M5 12h14"/><path d="M12 5v14"/>',
  'chevron-down': '<path d="m6 9 6 6 6-6"/>',
  'chevron-right': '<path d="m9 18 6-6-6-6"/>',
  'calendar': '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/>',
  'mail': '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
  'phone': '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>',
  'dollar-sign': '<line x1="12" y1="2" x2="12" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
  'more-horizontal': '<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>',
  'filter': '<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>',
  'check': '<path d="M20 6 9 17l-5-5"/>',
  'arrow-up-right': '<path d="M7 7h10v10"/><path d="M7 17 17 7"/>',
  'zap': '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
  'credit-card': '<rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>',
  'log-out': '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>',
  'star': '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
  'play': '<polygon points="6 3 20 12 6 21 6 3"/>',
  'inbox': '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
  'sparkles': '<path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3z"/>',
  'trending-up': '<polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>',
  'clock': '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  'file-text': '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z"/><path d="M14 2v5h5"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/>',
  'building': '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01M16 6h.01M12 6h.01M12 10h.01M12 14h.01M16 10h.01M16 14h.01M8 10h.01M8 14h.01"/>',
  'home': '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
  'menu': '<line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/>',
  'x': '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  'arrow-right': '<line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>'
};
function Icon({
  name,
  size = 20,
  strokeWidth = 2,
  color = 'currentColor',
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("svg", _extends({
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: color,
    strokeWidth: strokeWidth,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    style: {
      flex: 'none',
      ...style
    },
    dangerouslySetInnerHTML: {
      __html: ICONS[name] || ''
    }
  }, rest));
}
window.ABCIcons = {
  Icon,
  ICON_NAMES: Object.keys(ICONS)
};
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/web-app/icons.jsx", error: String((e && e.message) || e) }); }

__ds_ns.Avatar = __ds_scope.Avatar;

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.CardHeader = __ds_scope.CardHeader;

__ds_ns.IconButton = __ds_scope.IconButton;

__ds_ns.Alert = __ds_scope.Alert;

__ds_ns.Stat = __ds_scope.Stat;

__ds_ns.Tabs = __ds_scope.Tabs;

__ds_ns.Checkbox = __ds_scope.Checkbox;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.Select = __ds_scope.Select;

__ds_ns.Switch = __ds_scope.Switch;

})();
