/*
** Interfaces :
** <position> = {
**      sx: (int) start column,
**      ex: (int) end column,
**      sy: (int) start line,
**      ey: (int) end line,
** }
*/

const {
    workspace,
    window,
    Position,
    Range
} = require('vscode')
const path = require('path')

const VALID_LANGUAGES = ['c', 'cpp', 'h']
const TAB_SIZE = 8
const INVISIBLE_CHAR = '\x01'
const HEADER_REGEX = /\/\*\n\*\* EPITECH PROJECT, [0-9]{4}\n\*\* .*\n\*\* File description:\n(\*\* .*\n)+\*\/\n.*/
const REGEX_INVALID_RULES = [
    {
        regex: /(\t| )+$/m,
        msg: 'Line can\'t end with tabs or spaces.'
    },
    {
        regex: / +\t+/m,
        msg: 'Can\'t have multiple tabs or spaces.'
    },
    {
        regex: /(?={(.*|.*\n)*)(\/\/|\/\*).*/m,
        msg: 'Can\'t have comment inside function.'
    },
    {
        regex: /\t+ +/m,
        msg: 'Can\'t have multiple tabs or spaces.'
    },
    {
        regex: /{(.*\n){21,}\}/m,
        msg: 'Function can\'t exceed 80 lines.'
    },
    {
        regex: /(return|if|else if|else|while|for)(?=\(|  +|\t)/,
        msg: 'Must have space after keyword.'
    },
    {
        regex: /\(([^(),]*,){4,}[^()]*\)[ \t\n]+(?={)/,
        msg: 'Can\'t have more than 4 parameters to function.'
    }
]

exports.activate = (context) => {
    console.log('Epitech-styling-code is now ready.')

    // events
    workspace.onDidChangeTextDocument(checkStylingCode)
    workspace.onDidSaveTextDocument(checkStylingCode)

    // first start of check coding style
    checkStylingCode()
}

/*
** Main function to check coding style
*/
function checkStylingCode() {
    if (!isValidLanguage()) {
        return
    }

    const textContent = getTextContent()
    if (!textContent) {
        return
    }

    const positionsToUnderline = [
        ...getInvalidStylingCode(textContent),
        ...getInvalidStylingCodeRegex(textContent),
    ]
    underline(positionsToUnderline)
}

/*
** Get all areas where epitech styling code is not respected.
** (where regex isn't enough powerful to check coding style)
** @textContent (string) Text content of active tab.
** @return (array of <position>) positionsToUnderline
*/
const getInvalidStylingCode = (textContent) => {
    const lines = textContent.split('\n')
    const positionsToUnderline = [
        ...checkFileHeader(textContent),
        ...checkNumberColumns(lines),
        ...checkCommentInsideFunction(lines)
    ]

    return positionsToUnderline
}

/*
** Check column number of each line.
** @lines (array of str)
** @return (array of <position>) positionsToUnderline
*/
const checkNumberColumns = (lines) => {
    let positionsToUnderline = []
    lines.forEach((line, i) => {
        line = line.replace(/\t/g, ' '.repeat(TAB_SIZE))
        if (line.length > 80) {
            positionsToUnderline.push({
                ...getPositionOfSelectedLine(line, i)
            })
        }
    })
    return positionsToUnderline
}

/*
** Check comment inside function. Remember it's forbidden at Epitech.
** @lines (array of str)
** @return (array of <position>) positionsToUnderline
*/
const checkCommentInsideFunction = (lines) => {
    let positionsToUnderline = []
    let isInFunction = false
    lines.forEach((line, i) => {
        if (line.match(/^{/)) {
            isInFunction = true
        }
        else if (line.match(/^}/)) {
            isInFunction = false
        }
        if (isInFunction && line.match(/(\/\/|\/\*)/)) {
            positionsToUnderline.push({
                ...getPositionOfSelectedLine(line, i)
            })
        }
    })
    return positionsToUnderline
}

/*
** Check Epitech file header pattern.
** @textContent (string) Text content of active tab.
** @return (array of <position>) positionsToUnderline
*/
const checkFileHeader = (textContent) => {
    let positionsToUnderline = []
    if (!textContent.match(HEADER_REGEX)) {
        positionsToUnderline.push({
            sx: 0,
            sy: 0,
            ex: Number.MAX_VALUE,
            ey: 5
        })
    }
    return positionsToUnderline
}

/*
** Get all areas where epitech styling code is not respected.
** @initialTextContent (string) Text content of active tab.
** @return (array of <position>) positionsToUnderline
*/
const getInvalidStylingCodeRegex = (initialTextContent) =>{
    let positionsToUnderline = []
    REGEX_INVALID_RULES.forEach(regexRule => {
        let textContent = initialTextContent
        while (regMatch = textContent.match(regexRule.regex)) {
            const indexOfEndMatch = regMatch.index + regMatch[0].length
            const position = getPositionOfMatch(textContent, regMatch)
            positionsToUnderline.push(position)
            textContent = replace(textContent, /[^\n]/g, INVISIBLE_CHAR,
                                    indexOfEndMatch)
        }
    })
    return positionsToUnderline    
}

/*
** replace characters in string with characters number limit.
** @str (str) Initial string content.
** @reg (regExp) Regex rule replacement.
** @replaceChar (char) Replacement character.
** @nbCharMax (int) Limit area to be replaced.
** @return (str) Initial text with char replacements.
*/
const replace = (str, reg, replaceChar, nbCharMax) => {
    const pre = str.substr(0, nbCharMax)
    const post = str.substr(nbCharMax)
    return pre.replace(reg, replaceChar) + post
}

/*
** Get textContent of active tab.
** @return (str) textContent
*/
const getTextContent = () => {
    const editor = window.activeTextEditor
    if (!editor) {
        return null
    }
    const doc = editor.document
    if (!doc) {
        return null
    }
    const textContent = doc.getText()
    if (!textContent) {
        return null
    }
    return textContent
}

/*
** Check if current opened file is in VALID_LANGUAGES array.
** @return (bool) res
*/
const isValidLanguage = () => {
    const editor = window.activeTextEditor
    if (!editor) {
        return false
    }
    const doc = editor.document
    if (!doc) {
        return false
    }
    const ext = doc.fileName.split('.').reverse()[0]
    return VALID_LANGUAGES.includes(ext)
}

/*
** Get position of match.
** @textContent (str) Text content of active window.
** @regMatch (obj) Returned value of String.match().
** @return <position> Position of match.
*/
const getPositionOfMatch = (textContent, regMatch) => {
    const matchEnd = regMatch.index + regMatch[0].length

    const beginText = textContent.substr(0, regMatch.index)
    const lineStart = beginText.match(/\n/g).length
    const beginReturnLineIndex = beginText.lastIndexOf('\n') + 1

    const endText = textContent.substr(0, matchEnd)
    const lineEnd = endText.match(/\n/g).length
    const endReturnLineIndex = endText.lastIndexOf('\n') + 1

    const start = {
        sy: lineStart,
        sx: regMatch.index - beginReturnLineIndex
    }
    const end = {
        ey: lineEnd,
        ex: matchEnd - endReturnLineIndex
    }
    return { ...start, ...end }
}

/*
** Get position of selected line.
** @return <position> Position of match.
*/
const getPositionOfSelectedLine = (line, i) => ({
    sx: 0,
    sy: i,
    ex: line.length,
    ey: i
})

const errorDecorator = window.createTextEditorDecorationType({
    backgroundColor: '#de6767'
})

/*
** Underline characters between start and end of position in positions.
** @positions (array of <position>)
*/
function underline(positions) {
    const editor = window.activeTextEditor
    if (!editor) {
        return
    }

    let rangesToUnderline = []
    positions.forEach(position => {
        const { sx, sy, ex, ey } = position
        const startPos = new Position(sy, sx)
        const endPos = new Position(ey, ex)
        rangesToUnderline.push(new Range(startPos, endPos))
    })
    editor.setDecorations(errorDecorator, [])
    editor.setDecorations(errorDecorator, rangesToUnderline)
}

