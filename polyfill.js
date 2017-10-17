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

"use strict";

// Unlike Firefox and Microsoft Edge, Chrome doesn't have a "browser" object,
// but provides the extension API through the "chrome" namespace
// (non-standard).
if (typeof browser == "undefined")
  window.browser = chrome;

// Workaround since HTMLCollection, NodeList, StyleSheetList, and CSSRuleList
// didn't have iterator support before Chrome 51.
// https://bugs.chromium.org/p/chromium/issues/detail?id=401699
for (let object of [HTMLCollection, NodeList, StyleSheetList, CSSRuleList])
{
  if (!(Symbol.iterator in object.prototype))
    object.prototype[Symbol.iterator] = Array.prototype[Symbol.iterator];
}