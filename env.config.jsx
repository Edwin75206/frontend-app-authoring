import React, { useEffect } from 'react';
import Cookies from 'universal-cookie';

import { getConfig } from '@edx/frontend-platform';

function addPlugins(config, slot_name, plugins) {
  if (slot_name in config.pluginSlots === false) {
    config.pluginSlots[slot_name] = {
      keepDefault: true,
      plugins: []
    };
  }

  config.pluginSlots[slot_name].plugins.push(...plugins);
}

let themeCookie = 'indigo-toggle-dark';
let themeCookieExpiry = 90; // days

const AddDarkTheme = () => {
  const cookies = new Cookies();
  const isThemeToggleEnabled = getConfig().INDIGO_ENABLE_DARK_TOGGLE;

  const getCookieExpiry = () => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), today.getDate() + themeCookieExpiry);
  };

  const getCookieOptions = () => {
    const serverURL = new URL(getConfig().LMS_BASE_URL);
    const options = { domain: serverURL.hostname, path: '/', expires: getCookieExpiry() };
    return options;
  };

  const addDarkThemeToIframes = () => {
    const iframes = document.getElementsByTagName('iframe');
    const iframesLength = iframes.length;
    if (iframesLength > 0) {
      Array.from({ length: iframesLength }).forEach((_, index) => {
        const style = document.createElement('style');
        style.textContent = `
          body{
            background-color: #0D0D0E;
            color: #ccc;
          }
          a {color: #ccc;}
          a:hover{color: #d3d3d3;}
          `;
        if (iframes[index].contentDocument) { iframes[index].contentDocument.head.appendChild(style); }
      });
    }
  };

  useEffect(() => {
    const theme = cookies.get(themeCookie);

    // - When page loads, Footer loads before MFE content. Since there is no iframe on page,
    // it does not append any class. MutationObserver observes changes in DOM and hence appends dark
    // attributes when iframe is added. After 15 sec, this observer is destroyed to conserve resources. 
    // - It has been added outside dark-theme condition so that it can be removed on Component Unmount.
    // - Observer can be passed to `addDarkThemeToIframes` function and disconnected after observing Iframe.
    // This approach has a limitation: the observer first detects the iframe and then detects the docSrc. 
    // We need to wait for docSrc to fully load before appending the style tag.
    const observer = new MutationObserver(() => {
      addDarkThemeToIframes();
    });

    if (isThemeToggleEnabled && theme === 'dark') {
      document.body.classList.add('indigo-dark-theme');
      
      observer.observe(document.body, { childList: true, subtree: true });
      setTimeout(() => observer?.disconnect(), 15000); // clear after 15 sec to avoid resource usage

      cookies.set(themeCookie, theme, getCookieOptions());      //  on page load, update expiry
    }

    return () => observer?.disconnect();
  }, []);

  return (<div />);
};

async function setConfig () {
  let config = {
    pluginSlots: {}
  };

  try {
    /* We can't assume FPF exists, as it's not declared as a dependency in all
     * MFEs, so we import it dynamically. In addition, for dynamic imports to
     * work with Webpack all of the code that actually uses the imported module
     * needs to be inside the `try{}` block.
     */
    const { DIRECT_PLUGIN, PLUGIN_OPERATIONS } = await import('@openedx/frontend-plugin-framework');
const { default: IndigoFooter } = await import('@edly-io/indigo-frontend-component-footer');
    addPlugins(config, 'learning_logged_out_items_slot', [
    {
      op: PLUGIN_OPERATIONS.Modify,
      widgetId: 'default_contents',
      fn: (widget) => {
        widget.content.buttonsInfo = [
          {
            href: 'https://docs.openedx.org/en/latest/',
            message: 'Documentation'
          },
          {
            href: 'https://discuss.openedx.org/',
            message: 'Forums'
          },
          {
            href: 'https://openedx.org/',
            message: 'openedx.org',
            variant: 'primary'
          }
        ];
        return widget;
      }
    }
    ]);
    addPlugins(config, 'footer_slot', [
        {
          op: PLUGIN_OPERATIONS.Hide,
          widgetId: 'default_contents',
        }]);
    addPlugins(config, 'footer_slot', [
        {
          op: PLUGIN_OPERATIONS.Insert,
          widget: {
            id: 'custom_footer',
            type: DIRECT_PLUGIN,
            RenderWidget: () => (
               <>
                {/* --- Estilos específicos para el footer --- */}
                <style>{`
                  .custom-footer a {
                    color: #000;
                    text-decoration: none;
                    transition: color 0.2s ease;
                  }
                  .custom-footer a:hover {
                    color: #0275d8;
                  }
                `}</style>

                {/* --- Estructura del footer --- */}
                <footer className="custom-footer" style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  borderTop: '1px solid #ccc',
                  padding: '1.5rem 2rem',
                  backgroundColor: '#fff',
                  fontSize: '0.9rem',
                }}>
                  {/* Enlaces centrados */}
                  <nav style={{
                    display: 'flex',
                    gap: '1.5rem',
                    marginBottom: '0.5rem',
                  }}>
                    <a href="https://www.academusdigital.com/faq/" target="_blank">Preguntas Frecuentes</a>
                    <a href="https://www.academusdigital.com/contact/" target="_blank">Contáctanos</a>
                  </nav>
                  {/* Copyright centrado */}
                  <div>Copyrights ©2025. Academus Digital.</div>
                </footer>
              </>
            ),
          },
        }]);
    addPlugins(config, 'logo_slot', [
    {
      op: PLUGIN_OPERATIONS.Hide,
      widgetId: 'default_contents',
    }]);
    addPlugins(config, 'logo_slot', [
    {
      op: PLUGIN_OPERATIONS.Insert,
      widget: {
        id: 'custom_logo_component',
        type: DIRECT_PLUGIN,
        RenderWidget: () => (
          <a
              href="https://apps.app.academusdigital.com/learner-dashboard/"
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center' }}
            >
              <img
                src="https://raw.githubusercontent.com/Edwin75206/tutor-contrib-enable-feature-flag/refs/heads/main/images/logo.png"
                alt="Academus Digital"
                style={{
                  height: '40px',
                  width: 'auto',
                  marginRight: '1rem',
                }}
              />
            </a>
        ),
      },
    }]);
    addPlugins(config, 'footer_slot', [
        {
          op: PLUGIN_OPERATIONS.Insert,
          widget: {
            id: 'hide_discover_new_css',
            type: DIRECT_PLUGIN,
            RenderWidget: () => (
              <style>
                {`
                  /* Oculta sólo "Discover New" */
                  header.site-header-desktop .nav.main-nav .nav-link:nth-child(2) {
                    display: none !important;
                  }
                `}
              </style>
            ),
          },
        }
        ]);
    if (process.env.APP_ID == 'authn') {
    }
    if (process.env.APP_ID == 'authoring') {
    }
    if (process.env.APP_ID == 'account') {
      addPlugins(config, 'footer_slot', [ 
            {
                op: PLUGIN_OPERATIONS.Insert,
                widget: {
                    id: 'read_theme_cookie',
                    type: DIRECT_PLUGIN,
                    priority: 2,
                    RenderWidget: AddDarkTheme,
                },
            },
  ]);
    }
    if (process.env.APP_ID == 'communications') {
    }
    if (process.env.APP_ID == 'discussions') {
      addPlugins(config, 'footer_slot', [ 
            {
                op: PLUGIN_OPERATIONS.Insert,
                widget: {
                    id: 'read_theme_cookie',
                    type: DIRECT_PLUGIN,
                    priority: 2,
                    RenderWidget: AddDarkTheme,
                },
            },
  ]);
    }
    if (process.env.APP_ID == 'gradebook') {
    }
    if (process.env.APP_ID == 'learner-dashboard') {
      addPlugins(config, 'footer_slot', [ 
            {
                op: PLUGIN_OPERATIONS.Insert,
                widget: {
                    id: 'read_theme_cookie',
                    type: DIRECT_PLUGIN,
                    priority: 2,
                    RenderWidget: AddDarkTheme,
                },
            },
  ]);
    }
    if (process.env.APP_ID == 'learning') {
      addPlugins(config, 'footer_slot', [ 
            {
                op: PLUGIN_OPERATIONS.Insert,
                widget: {
                    id: 'read_theme_cookie',
                    type: DIRECT_PLUGIN,
                    priority: 2,
                    RenderWidget: AddDarkTheme,
                },
            },
  ]);
    }
    if (process.env.APP_ID == 'ora-grading') {
    }
    if (process.env.APP_ID == 'profile') {
      addPlugins(config, 'footer_slot', [ 
            {
                op: PLUGIN_OPERATIONS.Insert,
                widget: {
                    id: 'read_theme_cookie',
                    type: DIRECT_PLUGIN,
                    priority: 2,
                    RenderWidget: AddDarkTheme,
                },
            },
  ]);
    }
  } catch { }

  return config;
}

export default setConfig;