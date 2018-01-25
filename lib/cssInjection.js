/*
 * This file is part of Adblock Plus <https://adblockplus.org/>,
 * Copyright (C) 2006-present eyeo GmbH
 *
 * Adblock Plus is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License version 3 as
 * published by the Free Software Foundation.
 *
 * Adblock Plus is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with Adblock Plus.  If not, see <http://www.gnu.org/licenses/>.
 */

/** @module cssInjection */

"use strict";

const {RegExpFilter} = require("filterClasses");
const {ElemHide} = require("elemHide");
const {ElemHideEmulation} = require("elemHideEmulation");
const {checkWhitelisted} = require("whitelisting");
const {extractHostFromFrame} = require("url");
const {port} = require("messaging");
const devtools = require("devtools");

const userStyleSheetsSupported = "extensionTypes" in browser &&
                                 "CSSOrigin" in browser.extensionTypes;

function addStyleSheet(tabId, frameId, styleSheet)
{
  browser.tabs.insertCSS(tabId, {
    code: styleSheet,
    cssOrigin: "user",
    frameId,
    matchAboutBlank: true,
    runAt: "document_start"
  });
}

function removeStyleSheet(tabId, frameId, styleSheet)
{
  browser.tabs.removeCSS(tabId, {
    code: styleSheet,
    cssOrigin: "user",
    frameId,
    matchAboutBlank: true
  });
}

function updateFrameStyles(tabId, frameId, selectors, groupName)
{
  let styleSheet = null;
  if (selectors.length > 0)
    styleSheet = selectors.join(", ") + "{display: none !important;}";

  let frame = ext.getFrame(tabId, frameId);
  if (!frame.injectedStyleSheets)
    frame.injectedStyleSheets = new Map();

  let oldStyleSheet = frame.injectedStyleSheets.get(groupName);

  // Ideally we would compare the old and new style sheets and skip this code
  // if they're the same, but the old style sheet can be a leftover from a
  // previous instance of the frame. We must add the new style sheet
  // regardless.

  // Add the new style sheet first to keep previously hidden elements from
  // reappearing momentarily.
  if (styleSheet)
    addStyleSheet(tabId, frameId, styleSheet);

  // Sometimes the old and new style sheets can be exactly the same. In such a
  // case, do not remove the "old" style sheet, because it is in fact the new
  // style sheet now.
  if (oldStyleSheet && oldStyleSheet != styleSheet)
    removeStyleSheet(tabId, frameId, oldStyleSheet);

  frame.injectedStyleSheets.set(groupName, styleSheet);
}

port.on("elemhide.getSelectors", (message, sender) =>
{
  let selectors = [];
  let emulatedPatterns = [];
  let trace = devtools && devtools.hasPanel(sender.page);
  let inline = !userStyleSheetsSupported;

  if (!checkWhitelisted(sender.page, sender.frame,
                        RegExpFilter.typeMap.DOCUMENT |
                        RegExpFilter.typeMap.ELEMHIDE))
  {
    let hostname = extractHostFromFrame(sender.frame);
    let specificOnly = checkWhitelisted(sender.page, sender.frame,
                                        RegExpFilter.typeMap.GENERICHIDE);

    selectors = ElemHide.getSelectorsForDomain(
      hostname,
      specificOnly ? ElemHide.SPECIFIC_ONLY : ElemHide.ALL_MATCHING
    );

    for (let filter of ElemHideEmulation.getRulesForDomain(hostname))
      emulatedPatterns.push({selector: filter.selector, text: filter.text});
  }

  if (!inline)
    updateFrameStyles(sender.page.id, sender.frame.id, selectors);

  let response = {trace, inline, emulatedPatterns};
  if (trace || inline)
    response.selectors = selectors;

  return response;
});

port.on("elemhide.injectSelectors", (message, sender) =>
{
  updateFrameStyles(sender.page.id, sender.frame.id, message.selectors,
                    message.groupName);
});
