import { updateWordCanvas } from "../interfaceEdit.js";
import { calcWordMetrics } from "../fontUtils.js"
import ocr from "./ocrObjects.js";

const fontSizeElem = /** @type {HTMLInputElement} */(document.getElementById('fontSize'));
const wordFontElem = /** @type {HTMLInputElement} */(document.getElementById('wordFont'));

const styleItalicElem = /** @type {HTMLInputElement} */(document.getElementById('styleItalic'));
const styleSmallCapsElem = /** @type {HTMLInputElement} */(document.getElementById('styleSmallCaps'));
const styleSuperElem = /** @type {HTMLInputElement} */(document.getElementById('styleSuper'));
const rangeBaselineElem = /** @type {HTMLInputElement} */(document.getElementById('rangeBaseline'));

const styleItalicButton = new bootstrap.Button(styleItalicElem);
const styleSmallCapsButton = new bootstrap.Button(styleSmallCapsElem);
const styleSuperButton = new bootstrap.Button(styleSuperElem);

/**
 * Represents an OCR word printed on the fabric.js canvas.
 * It extends the `fabric.IText` class from the fabric.js library.
 */
export const ITextWord = fabric.util.createClass(fabric.IText, {

    type: 'ITextWord',

    initialize: function (text, options) {
        options || (options = {});

        this.callSuper('initialize', text, options);

        this.set('word', options.word);

        this.set('leftOrig', options.leftOrig);
        this.set('topOrig', options.topOrig);
        this.set('baselineAdj', options.baselineAdj);
        this.set('wordSup', options.wordSup);

        this.set('fill_proof', options.fill_proof);
        this.set('fill_ebook', options.fill_ebook);
        this.set('fill_eval', options.fill_eval);

        this.set('fontFamilyLookup', options.fontFamilyLookup);
        this.set('fontStyleLookup', options.fontStyleLookup);

        this.set('wordID', options.wordID);
        // Can this be removed?
        // this.set('line', options.line);
        this.set('visualWidth', options.visualWidth);
        // Can this be removed?
        // this.set('visualBaseline', options.visualBaseline);
        this.set('defaultFontFamily', options.defaultFontFamily);
        this.set('textBackgroundColor', options.textBackgroundColor);
        this.set('showTextBoxBorder', options.showTextBoxBorder);

        this.hasControls = true;
        this.setControlsVisibility({ bl: false, br: false, mb: false, ml: true, mr: true, mt: false, tl: false, tr: false, mtr: false });

        this.on('editing:exited', async function () {
            if (this.hasStateChanged) {
                if (document.getElementById("smartQuotes").checked && /[\'\"]/.test(this.text)) {
                    let textInt = this.text;
                    textInt = textInt.replace(/(^|[-–—])\'/, "$1‘");
                    textInt = textInt.replace(/(^|[-–—])\"/, "$1“");
                    textInt = textInt.replace(/\'(?=$|[-–—])/, "’");
                    textInt = textInt.replace(/\"(?=$|[-–—])/, "”");
                    textInt = textInt.replace(/([a-z])\'(?=[a-z]$)/i, "$1’");
                    this.text = textInt;
                }

                await updateWordCanvas(this);

                const wordObj = ocr.getPageWord(globalThis.ocrAll.active[currentPage.n], this.wordID);

                if (!wordObj) {
                    console.warn("Canvas element contains ID" + this.wordID + "that does not exist in OCR data.  Skipping word.");
                } else {
                    wordObj.text = this.text;
                }
            }
        });
        this.on('selected', function () {
            // If multiple words are selected in a group, all the words in the group need to be considered when setting the UI
            if (this.group) {
                if (!this.group.style) {
                    let fontFamilyGroup = null;
                    let fontSizeGroup = null;
                    let supGroup = null;
                    let italicGroup = null;
                    let smallCapsGroup = null;
                    let singleFontFamily = true;
                    let singleFontSize = true;
                    for (let i = 0; i < this.group._objects.length; i++) {
                        const wordI = this.group._objects[i];
                        // If there is no wordID then this object must be something other than a word
                        if (!wordI.wordID) continue;

                        // Font style and font size consider all words in the group
                        if (fontFamilyGroup == null) {
                            fontFamilyGroup = wordI.fontFamily.replace(/ Small Caps/, "");
                        } else {
                            if (wordI.fontFamily.replace(/ Small Caps/, "") != fontFamilyGroup) {
                                singleFontFamily = false;
                            }
                        }

                        if (fontSizeGroup == null) {
                            fontSizeGroup = wordI.fontSize;
                        } else {
                            if (wordI.fontSize != fontSizeGroup) {
                                singleFontSize = false;
                            }
                        }

                        // Style toggles only consider the first word in the group
                        if (supGroup == null) supGroup = wordI.wordSup;
                        if (italicGroup == null) italicGroup = wordI.fontStyle == "italic";
                        if (smallCapsGroup == null) smallCapsGroup = /Small Caps/i.test(wordI.fontFamily);
                    }

                    this.group.style = {
                        fontFamily: singleFontFamily ? fontFamilyGroup : "",
                        fontSize: singleFontSize ? fontSizeGroup : "",
                        sup: supGroup,
                        italic: italicGroup,
                        smallCaps: smallCapsGroup
                    }

                    wordFontElem.value = this.group.style.fontFamily;
                    fontSizeElem.value = this.group.style.fontSize;

                    if (this.group.style.sup != styleSuperElem.classList.contains("active")) {
                        styleSuperButton.toggle();
                    }
                    if (this.group.style.italic != styleItalicElem.classList.contains("active")) {
                        styleItalicButton.toggle();
                    }
                    if (this.group.style.smallCaps != styleSmallCapsElem.classList.contains("active")) {
                        styleSmallCapsButton.toggle();
                    }
                }

                // If only one word is selected, we can just use the values for that one word
            } else {
                const fontFamily = this.fontFamily.replace(/ Small Caps/, "");
                if (!this.defaultFontFamily) {
                    wordFontElem.value = fontFamily;
                }
                fontSizeElem.value = this.fontSize;
                if (this.wordSup != styleSuperElem.classList.contains("active")) {
                    styleSuperButton.toggle();
                }
                const italic = this.fontStyle == "italic";
                if (italic != styleItalicElem.classList.contains("active")) {
                    styleItalicButton.toggle();
                }
                const smallCaps = /Small Caps/i.test(this.fontFamily);
                if (smallCaps != styleSmallCapsElem.classList.contains("active")) {
                    styleSmallCapsButton.toggle();
                }
            }
        });
        this.on('deselected', function () {
            wordFontElem.value = "Default";
            //document.getElementById("collapseRange").setAttribute("class", "collapse");
            bsCollapse.hide();
            rangeBaselineElem.value = "100";
        });
        this.on('modified', async (opt) => {
            if (opt.action == "scaleX") {
                const textboxWidth = opt.target.calcTextWidth();

                const wordMetrics = await calcWordMetrics(opt.target.text, opt.target.fontObj, opt.target.fontSize);
                const visualWidthNew = (textboxWidth - wordMetrics["leftSideBearing"] - wordMetrics["rightSideBearing"]) * opt.target.scaleX;

                let visualRightNew = opt.target.left + visualWidthNew;
                let visualRightOrig = opt.target.leftOrig + opt.target.visualWidth;

                const wordObj = ocr.getPageWord(globalThis.ocrAll.active[currentPage.n], opt.target.wordID);

                if (!wordObj) {
                    console.warn("Canvas element contains ID" + opt.target.wordID + "that does not exist in OCR data.  Skipping word.");
                } else {
                    const leftDelta = Math.round(opt.target.left - opt.target.leftOrig);
                    const rightDelta = Math.round(visualRightNew - visualRightOrig);
                    wordObj.bbox[0] = wordObj.bbox[0] + leftDelta;
                    wordObj.bbox[2] = wordObj.bbox[2] + rightDelta;
                }

                if (opt.target.text.length > 1) {


                    const widthDelta = visualWidthNew - opt.target.visualWidth;
                    if (widthDelta != 0) {
                        const charSpacingDelta = (widthDelta / (opt.target.text.length - 1)) * 1000 / opt.target.fontSize;
                        opt.target.charSpacing = (opt.target.charSpacing ?? 0) + charSpacingDelta;
                        opt.target.scaleX = 1;

                    }

                }
                opt.target.leftOrig = opt.target.left;
                opt.target.visualWidth = visualWidthNew;
            }
        });


    },

    // Displaying bounding boxes is useful for cases where text is correct but word segmentation is wrong
    // https://stackoverflow.com/questions/51233082/draw-border-on-fabric-textbox-when-its-not-selected
    _render: function (ctx) {
        this.callSuper('_render', ctx);

        if (this.showTextBoxBorder) {
            var w = this.width,
                h = this.height,
                x = -this.width / 2,
                y = -this.height / 2;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + w, y);
            ctx.lineTo(x + w, y + h);
            ctx.lineTo(x, y + h);
            ctx.lineTo(x, y);
            ctx.closePath();
            var stroke = ctx.strokeStyle;
            ctx.strokeStyle = this.textboxBorderColor;
            ctx.stroke();
            ctx.strokeStyle = stroke;
        }
    }
});
