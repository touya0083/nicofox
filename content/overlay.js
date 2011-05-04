/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*-
 * vim: sw=2 ts=2 sts=2 et filetype=javascript
 */

if (!nicofox) {var nicofox = {};}
Components.utils.import("resource://nicofox/Core.jsm", nicofox);
Components.utils.import("resource://nicofox/Services.jsm", nicofox);

nicofox.overlay = {
  /* On browser window loading */
  onLoad: function() {
    window.removeEventListener("load", nicofox.overlay.onLoad, false);
    /* initialization code */
    nicofox.overlay.initialized = true;

    /* Apply in-content UI whitelist to about:collection on Firefox 4. http://bugzil.la/571970 */
    if (XULBrowserWindow.inContentWhitelist) {
      XULBrowserWindow.inContentWhitelist.push("about:nicofox");
    }

    /* Register panel initializer */
    document.getElementById("nicofox-library").addEventListener("popupshowing", nicofox.panel.onPopupShowing, false);
    document.getElementById("nicofox-library").addEventListener("popupshown", nicofox.panel.onPopupShown, false);

    /* Register context menu showing listener */
    var contextMenu = document.getElementById("contentAreaContextMenu");
    if (contextMenu) {
      contextMenu.addEventListener("popupshowing", nicofox.overlay.onContextMenuShowing, false);
    }

    Components.utils.import("resource://nicofox/DownloadManager.jsm", nicofox);
    /* Update download manager statusbar, then register for changes */
    nicofox.refreshIcon();
    nicofox.DownloadManager.addListener(nicofox.listener);
    
    /* Watch DOMContentLoaded event to initialize NicoMonkey */
    var appcontent = window.document.getElementById("appcontent");
    if (appcontent) {
      appcontent.addEventListener("DOMContentLoaded", function(e) { nicofox.overlay.onDOMContentLoaded(e); }, false);    
    }
  },
  /* On browser window unloading */
  onUnload: function() {
    window.removeEventListener("unload", nicofox.overlay.onUnload, false);
    document.getElementById("nicofox-library").removeEventListener("popupshowing", nicofox.panel.onPopupShowing, false);
    document.getElementById("nicofox-library").removeEventListener("popupshown", nicofox.panel.onPopupShown, false);
    nicofox.DownloadManager.removeListener(nicofox.listener);
    var contextMenu = document.getElementById("contentAreaContextMenu");
    if (contextMenu) {
      contextMenu.removeEventListener("popupshowing", nicofox.overlay.onContextMenuShowing, false);
    }
  },
  /* On View -> NicoFox */
  onMenuItemCommand: function(e) {
    /* Temp workaround for Firefox 4: expand addon bar so that the panel can be shown */
    var addonBar = document.getElementById("addon-bar");
    if (addonBar) {
      addonBar.collapsed = false;
    }
    document.getElementById("nicofox-library").hidden = false;
    if (document.getElementById("nicofoxToolbarButton")) {
      document.getElementById("nicofox-library").openPopup(document.getElementById("nicofoxToolbarButton"), 'after_end', 0, 0, false, false);
    } else {
      document.getElementById("nicofox-library").openPopup(document.getElementById("nicofoxStatusbarContainer"), 'before_end', 0, 0, false, false);
    }
  },
  /* On context menu showing, check the link URL, provide download menuitem if necessary */
  onContextMenuShowing: function(aEvent) {
    var hidden = true;
    if (gContextMenu.onLink) {
      var url = gContextMenu.linkURL;
      if (url && /^http:\/\/(?:www|tw|de|es)\.nicovideo\.jp\/watch\/[a-z]{0,2}[0-9]+/.test(url)) {
        hidden = false;
      }
    }
    document.getElementById("nicofox-context-seprator").hidden = hidden;
    document.getElementById("nicofox-context-download").hidden = hidden;
  },
  /* When the context menu item is clicked. */
  downloadLink: function() {
    var url = gContextMenu.linkURL;
    if (url && /^http:\/\/(?:www|tw|de|es)\.nicovideo\.jp\/watch\/[a-z]{0,2}[0-9]+/.test(url)) {
      if (url.indexOf("?") >= 0) {
        url = url.substring(0, url.indexOf("?"))
      }
      Components.utils.import("resource://nicofox/DownloadManager.jsm", nicofox);
      nicofox.DownloadManager.addDownload(url);
    }
  },
  /* Based on Greasemonkey. Is the URL nicomonkeyable? */
  isNicomonkeyable: function(url) {
    var scheme = nicofox.Services.io.extractScheme(url);
    return (
      (scheme == "http") && /nicovideo\.jp\//.test(url)
    );
  },
  /* Based on Greasemonkey. When DOM loaded, launch NicoMonkey if needed. */
  onDOMContentLoaded: function(e) {
    if (!nicofox.Core.prefs.getBoolPref("nicomonkey.enable")){ return; }

    var safeWin = e.target.defaultView;
    var unsafeWin = safeWin.wrappedJSObject;
    var href = safeWin.location.href;

    if (this.isNicomonkeyable(href)) {
      Components.utils.import("resource://nicofox/NicoMonkey.jsm", nicofox)
      nicofox.NicoMonkey.domContentLoaded({ wrappedJSObject: unsafeWin }, window);
    }
  }
};
/* Refresh statusbar download notification */
nicofox.refreshIcon = function() {
  var nicofoxLabel = document.getElementById("nicofoxStatusbarLabel");
  if (!nicofoxLabel) { return; }
  var downloadCount = nicofox.DownloadManager.activeDownloadCount;
  var waitingCount = nicofox.DownloadManager.queuedDownloadCount;
  if (downloadCount > 0) {
    nicofoxLabel.setAttribute("value", downloadCount + "/" + (downloadCount + waitingCount));
    nicofoxLabel.hidden = false;
  } else {
    nicofoxLabel.setAttribute("value", "");
    nicofoxLabel.hidden = true;
  }
};
/* XXX: to display status in statusbar */
nicofox.listener = {

};
nicofox.listener.queueChanged = function(id, content) {
  nicofox.refreshIcon();
};
window.addEventListener("load", nicofox.overlay.onLoad, false);
window.addEventListener("unload", nicofox.overlay.onUnload, false);
