/* -*- js-standard: mozdomwindow,chromewindow,mozscript;
       js-import:browser.js;                              -*- */
/* ***** BEGIN LICENSE BLOCK *****
Version: MPL 1.1/GPL 2.0/LGPL 2.1

The contents of this file are subject to the Mozilla Public License Version
1.1 (the "License"); you may not use this file except in compliance with
the License. You may obtain a copy of the License at
http://www.mozilla.org/MPL/

Software distributed under the License is distributed on an "AS IS" basis,
WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
for the specific language governing rights and limitations under the
License.

The Original Code is Organize Search Engines.

The Initial Developer of the Original Code is
Malte Kraus.
Portions created by the Initial Developer are Copyright (C) 2006-2008
the Initial Developer. All Rights Reserved.

Contributor(s):
  Malte Kraus <mails@maltekraus.de> (Original author)

 Alternatively, the contents of this file may be used under the terms of
 either the GNU General Public License Version 2 or later (the "GPL"), or
 the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 in which case the provisions of the GPL or the LGPL are applicable instead
 of those above. If you wish to allow use of your version of this file only
 under the terms of either the GPL or the LGPL, and not to allow others to
 use your version of this file under the terms of the MPL, indicate your
 decision by deleting the provisions above and replace them with the notice
 and other provisions required by the GPL or the LGPL. If you do not delete
 the provisions above, a recipient may use your version of this file under
 the terms of any one of the MPL, the GPL or the LGPL.
***** END LICENSE BLOCK ***** */

function organizeSE__Extensions() {
  this.init();
};
organizeSE__Extensions.prototype = {
  init: function() {
    // using setTimeout(func.apply) doesn't work, so we use this wrapper function
    function applyWrapper(func, thisObj, otherArgs) {
      return func.apply(thisObj, (otherArgs || []));
    }
    var sortDirection = organizeSE.popupset.getAttribute("sortDirection");
    for each(var i in this) {
      if(typeof i == "object" && i.check) {
        if("wait" in i)
          setTimeout(applyWrapper, i.wait, i.init, i, []);
        else
          i.init();

        if("sortDirectionHandler" in i) {
          i.sortDirectionHandler(sortDirection);
          organizeSE._sortDirectionHandlers.push(i.sortDirectionHandler);
        }
        if("insertItemsHandler" in i) {
          i.insertItemsHandler.mod = i;
          if(!("subFolders" in i.insertItemsHandler))
            i.insertItemsHandler.subFolders = false;
          organizeSE._insertItemsHandlers.push(i.insertItemsHandler);
        }
        if("customizeToolbarHandler" in i)
          organizeSE._customizeToolbarListeners.push(i.customizeToolbarHandler);
      }
    }
  },
  /*****************************************************************************
   ** object properties here have these properties and methods:               **
   **   @property check: when set to false, the whole object will be ignored. **
   **   @method init: will be called by the onload event handler. Do some     **
   **     initialization stuff, e.g. set up some event listeners or replace   **
   **     an extension's orginal function/method with your own.               **
   **                                                                         **
   **   @optional method sortDirectionHandler: will be called when the sort   **
   **       direction is changed. Use this to update sortDirection attributes.**
   **   @optional property wait: defines the amount of milliseconds to wait   **
   **     before calling -> init. This becomes useful if you want to make     **
   **     sure the extension's very own onload handler has done its job       **
   **     before you begin modifying it. Usually set to 0 (zero).             **
   **   @optional property insertItemsHandler: if you want to insert menu     **
   **     items before/after the "Manage Engines" menuitem, you can set this  **
   **     to a object like this:                                              **
   **         @property pos: "before" or "after", call before/after the       **
   **           manage engines item was inserted/removed.                     **
   **         @method insertMethod: called when you should insert the menu    **
   **           items into the menu. The parent node is passed as first       **
   **           parameter.                                                    **
   **         @method removeMethod: equivalent to insertMethod, called when   **
   **            you should remove the menuitem from the DOM.                 **
   **         @optional property subFolders: insertMethod/removeMethod are    **
   **            not called for the root folder but for child folders if true **
   **   @optional method customizeToolbarHandler: this is called when some    **
   **     element in the toolbar is rebuilt, probably because the toolbars    **
   **     were customized. You may also want to call this method from init.   **
   ****************************************************************************/

  /*** Auto Context 1.4.5.3 ***/
  autocontext: {
    get check() {
      return ("gOverlayAutoContext" in window);
    },
    sortDirectionHandler: function sortDirectionHandler(newVal) {
      document.getElementById("autocontext-searchmenu").setAttribute("sortDirection", newVal);
    },
    wait: 0,
    init: function() {
      const menu = document.getElementById("autocontext-searchmenu");
      menu.addEventListener("popupshowing", this.onPopupShowing, true);
      gOverlayAutoContext.loadSearch = organizeSE.extensions.contextSearch.search;
    },
    onPopupShowing: function(event) {
      organizeSE.extensions.contextSearch.onPopupShowing(event);
    }
  },
  /*** Context Search 0.4.3 ***/
  contextSearch: {
    get check() {
      return ("contextsearch" in window);
    },
    sortDirectionHandler: function sortDirectionHandler(newVal) {
      contextsearch.contextitem.setAttribute("sortDirection", newVal);
    },
    wait: 0,
    init: function() {
      contextsearch.rebuildmenu = function() { };
      contextsearch.contextitem.addEventListener("popupshowing", this.onPopupShowing, true);
      contextsearch.search = this.search;
    },
    search: function(e) {
      var text;
      if(e.currentTarget.id == "autocontext-searchmenupopup")
        text = gOverlayAutoContext.getNewBrowserSelection();
      else
        text = contextsearch.getBrowserSelection(null, e);

      var where = whereToOpenLink(e, false, true);
      if(where == "current") where = "tab";

      var target = e.target, engine;
      if(organizeSE.hasClass(target, "openintabs-item")) {
        var folder = target.parentNode.parentNode.id;
        folder = seOrganizer_dragObserver.RDFService.GetResource(folder);
        engine = organizeSE.SEOrganizer.folderToEngine(folder);
      } else {
        engine = organizeSE.SEOrganizer.getEngineByName(target.label)
      }
      organizeSE.searchbar.doSearch(text, where, engine);
    },
    onPopupShowing: function(event) {
      if(event.target.parentNode == event.currentTarget) {
        event.target.id = (event.currentTarget.id == "autocontext-searchmenu") ?
                          "autocontext-searchmenupopup" : "context-searchpopup";
        event.currentTarget.builder.rebuild();
      } else {
        organizeSE.removeOpenInTabsItems(event.target);
        organizeSE.insertOpenInTabsItems(event.target);
        event.stopPropagation();
      }
    }
  },

  /*** searchOnTab 1.0.2 ***/
  searchOnTab: {
    get check() {
      return ("searchOnTab" in window);
    },
    insertItemsHandler: {
      pos: "before",
      insertMethod: function organizeEngines__searchOnTab__ihandler(popup) {
        searchOnTab.updateMenuItemCB();
        var sep = document.getElementById("sot_separator").cloneNode(true);
        sep.id += "-live";
        popup.appendChild(sep);
        var item = document.getElementById("sot_menuitem").cloneNode(true);
        item.id += "-live";
        popup.appendChild(item);
      },
      removeMethod: function organizeEngines__searchOnTab__rhandler(container) {
        var sep = document.getElementById("sot_separator-live");
        if(sep)
          sep.parentNode.removeChild(sep);
        var item = document.getElementById("sot_menuitem-live");
        if(item)
          item.parentNode.removeChild(item);
      }
    },
    wait: 0,
    init: function organizeEngines__searchOnTab__init() {
      var container = document.getElementById("searchpopup-bottom-container");
      var sot_item = document.getElementById("sot_menuitem");
      var sot_separator = sot_item.nextSibling;
      sot_separator.id = "sot_separator";
      container.insertBefore(sot_item, container.firstChild);
      container.insertBefore(sot_separator, container.firstChild);

      var popup = document.getAnonymousElementByAttribute(organizeSE.searchbar,
                                                   "anonid", "searchbar-popup");
      popup.parentNode.removeChild(popup);

      window.setTimeout(function() { organizeSE.popupset.builder.rebuild(); }, 1);
    }
  },

  /*** Second Search ***/
  secondSearch: {
    get check() { return ("SecondSearch" in window); },
    init: function() {
      SecondSearch.__defineGetter__("source", function() { return organizeSE.popup; });
      this.filterPopupEvents();
      SecondSearch.initAllEngines = this.initAllEngines;
    },
    /* update sortDirection attributes as neccesary */
    sortDirectionHandler: function sortDirectionHandler(newVal) {
      document.getElementById("secondsearch_popup_all")
                             .setAttribute("sortDirection", newVal);
      document.getElementById("secondsearch_popup").parentNode
                             .setAttribute("sortDirection", newVal);
    },
    filterPopupEvents: function() {
      SecondSearch.popup.addEventListener("popupshowing", function onPopupShowing(e) {
        var parent = e.target.parentNode;
        if(parent.datasources == "rdf:organized-internet-search-engines")
          parent.builder.rebuild();
      }, false);
      SecondSearch.popup.addEventListener("popuphiding", function onPopupHiding(e) {
        const XPATH = "descendant::xul:menupopup";
        organizeSE.evalXPath(XPATH, e.target).forEach(function(elem) {
          elem.hidePopup();
        });
      }, false);
    },
    initAllEngines: function(aPopup, aParent, aReverse) {
      var popup  = aPopup || this.popup, parent = aParent || null;

      var allMenuItem = this.allMenuItem;
      if(parent) { // we're in the child menu
        this.popup.parentNode.datasources = "rdf:null";
        allMenuItem.datasources = "rdf:organized-internet-search-engines";
      } else { // we're top level
        for(var i = popup.childNodes.length; i--;) {
          if(popup.childNodes[i].hasAttribute("engineName") ||
             popup.childNodes[i].id == "secondsearch-ose-sep") {
            popup.removeChild(popup.childNodes[i]);
          }
        }

        var popupParent = popup.parentNode;
        allMenuItem.datasources = "rdf:null";
        popupParent.datasources = "rdf:organized-internet-search-engines";
        popup = popupParent.lastChild;
        popup.id = "secondsearch_popup";
        popup.insertBefore(allMenuItem, popup.firstChild);
      }

      if(this.keywords.length) {
        var range = document.createRange();
        range.selectNodeContents(popup);
        if (popup.hasChildNodes()) {
          if (popup.firstChild == allMenuitem) {
            range.setStartAfter(popup.firstChild);
          }
          else if (popup.lastChild == allMenuitem) {
            range.setEndBefore(popup.lastChild);
          }
        }
        range.deleteContents();
        range.detach();

        if (popup.hasChildNodes())
          organizeSE.createMenuseparator(popup, "secondsearch-ose-sep");

        for (var i = 0, maxi = this.keywords.length; i < maxi; i++)
        {
          var keyword = this.keywords[i];
          if (keyword.uri && parent &&
              parent.getElementsByAttribute('engineName', keyword.name+'\n'+keyword.keyword).length)
          continue;

          var attrs = { src: keyword.icon, keyword: keyword.keyword,
                        engineName: keyword.name+'\n'+keyword.keyword };
          organizeSE.createMenuitem(popup, keyword.name, 'menuitem-iconic',
                                    'secondsearch-keyword-'+encodeURIComponent(keyword.name),
                                    attrs);
        }
      }

      popup.style.MozBoxDirection = (aReverse) ? "reverse" : "";
    }
  },

  /*** Thinger is not compatible with Firefox 3 ***/
  /*thinger: {
    init: function() {
      var popupset = document.getElementById("search-popupset");
      popupset.addEventListener("popupshowing", this, false);
    },
    wait: 0,
    get check() {
      return "thinger" in window;
    },
    handleEvent: function(event) {
      if(event.type != "popupshowing")
        return;
      var searchbar = document.document.getBindingParent(document.popupNode);
      var popup = event.target;

      for(var i = 0; i < popup.childNodes.length; i++) {
        if(popup.childNodes[i].hasAttribute("selected"))
          popup.childNodes[i].removeAttribute("selected");
      }
      var SEOrganizer = organizeSE.SEOrganizer;
      var name = searchbar.currentEngine.name;
      var item = SEOrganizer.getItemByName(name), elem;
      while(item && item.ValueUTF8 != "urn:organize-search-engines:root") {
        if((elem = document.getElementById(item.ValueUTF8)))
          elem.setAttribute("selected", "true");
        item = SEOrganizer.getParent(item);
      }
    }
  },*/

  /* SearchLoad Options 0.5.6 */
  searchLoad: {
    get check() { 
      return ("SearchLoad_Options" in window);
    },
    init: function() {
      var funcStr = searchLoadOptions_doSearch.toString();
      funcStr = funcStr.replace(/function .+/, ""); // strip first line
      funcStr = funcStr.substr(0, funcStr.length - 1); // strip last line
      funcStr = funcStr.replace(/(if \(keyPressed\))/, "\
organizeSE.extensions.searchLoad.doSearch(aData, submission);\
$1");
      searchLoadOptions_doSearch = new Function("aData", "keyPressed",
                                                "shiftPressed", funcStr);
    },
    doSearch: function(aData, aSubmission) {
      if(aSubmission instanceof Ci.nsISimpleEnumerator) {
        aSubmission = organizeSE.searchbar.currentEngine.getSubmission(aData, null);
        organizeSE.searchbar.doSearch(aData, "tabshifted", null, aSubmission);
      }
    },
    insertItemsHandler: {
      pos: "after",
      insertMethod: function(popup) {
        SearchLoad_Options.enginesPopup = popup;
        SearchLoad_Options.addMenuItem();
      },
      removeMethod: function(popup) {
        SearchLoad_Options.enginesPopup = popup;
        var node = document.getElementById("searchloadoptions-menuitem");
        if(node)
          node.parentNode.removeChild(node);
      }
    }
  },

  /* TabMix Plus 0.3.7.4pre.090107 */
  tabmix: {
    get check() {
      return ("TMP_SearchLoadURL" in window);
    },
    init: function() {
      TMP_SearchLoadURL = this.TMP_SearchLoadURL;
    },
    // rewriting that tmp method is easier than modifiying it with eval
    TMP_SearchLoadURL: function(aData, aEvent, aWhere) {
      if(TMP_getBoolPref(tabxBranch, "loadSearchInBackground", false)) {
        if(aWhere == "tab")
          aWhere = "tabshifted";
        else if(aWhere == "tabshifted")
          aWhere = "tab";
      }
      if((aWhere == "tab" || aWhere == "tabshifted") &&
         !TMP_whereToOpen(true, false).inNew) {
        aWhere = "current";
      }
      organizeSE.searchbar.doSearch(aData, aWhere);
    }
  }
};
