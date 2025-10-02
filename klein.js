
//finite state machine
let FSA = () => {
	let states = {};
	let state;

	return {
		get_states: () => {
			return {...states};
		},
		add_state: (name, transitions) => {
			states[name] = {name, transitions}
			return name;
		},
		set_state: (name) => {
			state = states[name];
		},
		step: (input) => {
			if(state.transitions[input]){
				state = states[state.transitions[input]];
				return null;
			}

			return state;
		}
	}
}

let Token = (type, start_line, end_line, start, end) => 
	({type, start_line, end_line, start, end});

let Scanner = (fsa, start_state, to_token) => {

	let string = "";
	let index = 0;
	let line_number = 0;

	let obj = {
		peek: () => {
			fsa.set_state(start_state);
			let scanned = 0;
			let scanned_lines = 0;
			let result = null;

			while(!result){
				if(string[index + scanned] == "\n")
					scanned_lines++;
				result = fsa.step(string[index + scanned++]);
			}

			return [to_token(
				result, 
				line_number,
				line_number + scanned_lines - 
					+(string[index + scanned-1] == "\n"),
				index, 
				index + scanned - 1
			), result];
		},
		next: () => {
			let [token, state] = obj.peek();
			if(token == null)
				return [token, state];
			index = token.end;
			line_number = token.end_line;
			return [token, state];
		},
		init: (str) => {
			string = str;
			index = 0;
			line_number = 0;
		}
	};

	return obj;
}


let KleinFSA = FSA();
let KleinScanner;
{
	let S = KleinFSA.add_state;

	let state_number = 0;
	let AS = (transitions) => KleinFSA.add_state("state " + state_number++, transitions);

	let alpha = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
	let digit = "0123456789";

	let char_transition = (str, state) => Object.fromEntries([...str].map(v => [v, state]));

	S("identifier", char_transition(alpha + digit + "_", "identifier"));
	S("nz_number", char_transition(digit, "nz_number"));


	let keyword_states = 0;
	let K = (name, word) => {
		let keyword_state = 
			S(name, char_transition(alpha + digit + "_", "identifier"));

		for(let i = word.length; i--;){
			let transitions = char_transition(alpha + digit + "_", "identifier");
			transitions[word[i]] = keyword_state;
			keyword_state = S("kstate " + keyword_states++, transitions);
		}

		return keyword_state;
	}

	S("start", {
	  ...char_transition(alpha, "identifier"),
	  "i": S("i", {
	    ...char_transition(alpha, "identifier"),
	    "f": S("if", char_transition(alpha + digit + "_", "identifier")),
	    "n": K("integer", "teger")
	  }),
	  "t": S("t", {
	    ...char_transition(alpha, "identifier"),
	    "r": K("true", "ue"),
	    "h": K("then", "en")
	  }),
	  "n": K("not", "ot"),
	  "f": S("f", {
	    ...char_transition(alpha, "identifier"),
	    "a": K("false", "lse"),
	    "u": K("function", "nction")
	  }),
	  "b": K("boolean", "oolean"),
	  "a": K("and", "nd"),
	  "p": K("print", "rint"),
	  "e": K("else", "lse"),
	  "o": K("or", "r"),
	  "(": S("left_paren", {
	    "*": S("comment_", {
		...char_transition(Array(256).fill()
			.map((v, i) => String.fromCharCode(i)).join(""), "comment_"),
		"*": AS({
			...char_transition(Array(256).fill()
				.map((v, i) => String.fromCharCode(i)).join(""), "comment_"),
			")": S("comment", {})
		})
	    })
	  }),
	  ")": S("right_paren", {}),
	  ",": S("comma", {}),
	  ":": S("colon", {}),
	  "+": S("plus", {}),
	  "-": S("minus", {}),
	  "*": S("star", {}),
	  "/": S("slash", {}),
	  "<": S("less_than", {}),
	  "=": S("equal", {}),
	
	  ...char_transition("123456789", "nz_number"),
	  "0": S("number", {}),

	  ...char_transition("\r\n\t\f\v ", 
		  S("white_space", char_transition("\r\n\t\f\v ", "white_space"))),

	  "undefined": S("end", {})
	});

	KleinScanner = Scanner(KleinFSA, "start", (state, start_line, end_line, start, end) => {
		let token_states = {
		  "boolean":"boolean", "integer":"integer", "identifier":"identifier", 
		  "number":"number",
		  "nz_number":"number", "if":"if", "then":"then", "else":"else",
		  "true":"true", "false":"false", "not":"not", "function":"function",
		  "and":"and", "print":"print", "or":"or", "left_paren":"left_paren",
		  "right_paren":"right_paren", "comment":"comment",
		  "comma":"comma", "colon":"colon",
		  "plus":"plus", "minus":"minus", "star":"star", "slash":"slash",
		  "less_than":"less_than", "equal":"equal", "white_space":"white_space",
		  "i": "identifier",
		  "t": "identifier",
		  "f": "identifier",
		  "end": "end",

		  ...Object.fromEntries(Array(keyword_states).fill()
			  .map((v, i) => ["kstate " + i, "identifier"]))
		};

		if(token_states[state.name])
			return Token(token_states[state.name], start_line, end_line, start, end);

		return null;
	});
}






let parse_table = {
	"PROGRAM": {
		"function": [ "push", [ 
			"NIL-ACTION",
			"DEFINITION-LIST" 
		] ],
		"end": [ ] 
	},
	"DEFINITION-LIST": {
		"function": [
			"push", [
				"DEFINITION",
				"LIST-ACTION",
				"DEFINITION-LIST"
			]
		],
		"end": [ ]
	},
	"DEFINITION": {
		"function": [
			"push", [
				"function",
			       	"identifier",
				"ID-ACTION",
			       	"left_paren",
			       	"PARAMETER-LIST",
			       	"right_paren",
			       	"colon",
			       	"TYPE", 
				"BODY",
				"FUNC-ACTION"
			]
		]
	},
	"PARAMETER-LIST": {
		"identifier": [
			"push", [ 
				"NIL-ACTION",
				"FORMAL-PARAMETERS" 
			]
		],
		"right_paren": [ 
			"push", [
				"NIL-ACTION"
			]
		]
	},
	"FORMAL-PARAMETERS": {
		"identifier": [
			"push", [
				"ID-WITH-TYPE",
				"LIST-ACTION",
				"FORMAL-PARAMETERS-2"
			]
		]
	},
	"FORMAL-PARAMETERS-2": {
		"comma": [
			"push", [
				"comma",
				"FORMAL-PARAMETERS"
			]	
		],
		"right_paren": [ ]
	},
	"ID-WITH-TYPE": {
		"identifier": [
			"push", [
				"identifier",
				"ID-ACTION",
				"colon", 
				"TYPE",
				"DECL-ACTION"
			]	
		]
	},
	"TYPE": {
		"boolean": [ "push", [ 
			"boolean",
			"TYPE-ACTION"
		] ],
		"integer": [ "push", [ 
			"integer",
			"TYPE-ACTION"
		] ]
	},
	"BODY": {
		"print": [
			"push", [
				"PRINT-EXPRESSION",
				"BODY",
				"SEQ-ACTION"
			]
		],

		"not": [
			"push", [ "EXPRESSION" ]
		],
		"minus": [
			"push", [ "EXPRESSION" ]	
		],
		"identifier": [
			"push", [ "EXPRESSION" ]	
		],
		"if": [
			"push", [ "EXPRESSION"]
		],
		"left_paren": [
			"push", [ "EXPRESSION" ]
		],
		"number": [
			"push", [ "EXPRESSION" ]	
		],
		"true": [
			"push", [ "EXPRESSION" ]
		],
		"false": [
			"push", [ "EXPRESSION" ]	
		]
	},
	"PRINT-EXPRESSION": {
		"print": [
			"push", [
				"print",
				"left_paren",
				"EXPRESSION",
				"right_paren",
				"PRINT-ACTION"
			]
		]
	},
	"EXPRESSION": {
		"not": [
			"push", [
				"SIMPLE-EXPRESSION",
				"EXPRESSION-2"
			]
		],
		"minus": [
			"push", [
				"SIMPLE-EXPRESSION",
				"EXPRESSION-2"
			]	
		],
		"identifier": [
			"push", [
				"SIMPLE-EXPRESSION",
				"EXPRESSION-2"
			]	
		],
		"if": [
			"push", [
				"SIMPLE-EXPRESSION",
				"EXPRESSION-2"
			]
		],
		"left_paren": [
			"push", [
				"SIMPLE-EXPRESSION",
				"EXPRESSION-2"
			]
		],
		"number": [
			"push", [
				"SIMPLE-EXPRESSION",
				"EXPRESSION-2"
			]	
		],
		"true": [
			"push", [
				"SIMPLE-EXPRESSION",
				"EXPRESSION-2"
			]
		],
		"false": [
			"push", [
				"SIMPLE-EXPRESSION",
				"EXPRESSION-2"
			]	
		]	
	},
	"EXPRESSION-2": {
		"equal": [
			"push", [
				"equal",
				"EXPRESSION",
				"EQUAL-ACTION"
			]
		],
		"less_than": [
			"push", [
				"less_than",
				"EXPRESSION",
				"LESS_THAN-ACTION"
			]
		],
		"comma": [ ],
		"then": [ ],
		"else": [ ],
		"right_paren": [ ],
		"function": [ ],
		"end": [ ]
	},

	"SIMPLE-EXPRESSION": {
		"not": [
			"push", [
				"TERM",
				"SIMPLE-EXPRESSION-2"
			]
		],
		"minus": [
			"push", [
				"TERM",
				"SIMPLE-EXPRESSION-2"
			]	
		],
		"identifier": [
			"push", [
				"TERM",
				"SIMPLE-EXPRESSION-2"
			]	
		],
		"if": [
			"push", [
				"TERM",
				"SIMPLE-EXPRESSION-2"
			]
		],
		"left_paren": [
			"push", [
				"TERM",
				"SIMPLE-EXPRESSION-2"
			]
		],
		"number": [
			"push", [
				"TERM",
				"SIMPLE-EXPRESSION-2"
			]	
		],
		"true": [
			"push", [
				"TERM",
				"SIMPLE-EXPRESSION-2"
			]
		],
		"false": [
			"push", [
				"TERM",
				"SIMPLE-EXPRESSION-2"
			]	
		]
	},

	"SIMPLE-EXPRESSION-2": {
		"or": [
			"push", [
				"or",
				"SIMPLE-EXPRESSION",
				"OR-ACTION"
			]
		],
		"plus": [
			"push", [
				"plus",
				"SIMPLE-EXPRESSION",
				"ADD-ACTION"
			]
		],
		"minus": [
			"push", [
				"minus",
				"SIMPLE-EXPRESSION",
				"SUB-ACTION"
			]
		],
		"comma": [ ],
		"then": [ ],
		"else": [ ],
		"right_paren": [ ],
		"function": [ ],
		"equal": [ ],
		"less_than": [ ],
		"end": [ ]
	},
	"TERM": {
		"not": [
			"push", [
				"FACTOR",
				"TERM-2"
			]
		],
		"minus": [
			"push", [
				"FACTOR",
				"TERM-2"
			]	
		],
		"identifier": [
			"push", [
				"FACTOR",
				"TERM-2"
			]	
		],
		"if": [
			"push", [
				"FACTOR",
				"TERM-2"
			]
		],
		"left_paren": [
			"push", [
				"FACTOR",
				"TERM-2"
			]
		],
		"number": [
			"push", [
				"FACTOR",
				"TERM-2"
			]	
		],
		"true": [
			"push", [
				"FACTOR",
				"TERM-2"
			]
		],
		"false": [
			"push", [
				"FACTOR",
				"TERM-2"
			]	
		]
	},

	"TERM-2": {
		"star": [
			"push", [
				"star",
				"TERM",
				"MUL-ACTION"
			]
		],
		"slash": [
			"push", [
				"slash",
				"TERM",
				"DIV-ACTION"
			]
		],
		"and": [
			"push", [
				"and",
				"TERM",
				"AND-ACTION"
			]
		],
		"comma": [ ],
		"then": [ ],
		"else": [ ],
		"right_paren": [ ],
		"function": [ ],
		"equal": [ ],
		"less_than": [ ],
		"or": [ ],
		"plus": [ ],
		"minus": [ ],
		"end": [ ]
	},
	"FACTOR": {
		"not": [
			"push", [
				"not",
				"FACTOR",
				"NOT-ACTION"
			]
		],
		"minus": [
			"push", [
				"minus",
				"FACTOR",
				"NEG-ACTION"
			]	
		],
		"identifier": [
			"push", [
				"identifier",
				"ID-ACTION",
				"FACTOR-2"
			]	
		],
		"if": [
			"push", [
				"if",
				"EXPRESSION",
				"then",
				"EXPRESSION",
				"else",
				"EXPRESSION",
				"IF-ACTION"
			]
		],
		"left_paren": [
			"push", [
				"left_paren",
				"EXPRESSION",
				"right_paren"
			]
		],
		"number": [ "push", [ "LITERAL" ] ],
		"true": [ "push", [ "LITERAL" ] ],
		"false": [
			"push", [ "LITERAL" ]	
		],

		"comma": [ ],
		"then": [ ],
		"else": [ ],
		"right_paren": [ ],
		"function": [ ],
		"equal": [ ],
		"less_than": [ ],
		"or": [ ],
		"plus": [ ],
		"star": [ ],
		"slash": [ ],
		"and": [ ],
		"null": [ ]
	},
	"FACTOR-2": {
		"left_paren": [
			"push", [
				"left_paren",
				"ARGUMENT-LIST",
				"right_paren",
				"CALL-ACTION"
			]
		],
		"comma": [ ],
		"then": [ ],
		"else": [ ],
		"right_paren": [ ],
		"function": [ ],
		"equal": [ ],
		"less_than": [ ],
		"or": [ ],
		"plus": [ ],
		"minus": [ ],
		"star": [ ],
		"slash": [ ],
		"and": [ ],
		"end": [ ]
	},

	"ARGUMENT-LIST": {
		"right_paren": [ ],
		"not": [
			"push", [ 
				"NIL-ACTION",
				"FORMAL-ARGUMENTS" 
			]
		],
		"minus": [
			"push", [ 
				"NIL-ACTION",
				"FORMAL-ARGUMENTS" 
			]	
		],
		"identifier": [
			"push", [ 
				"NIL-ACTION",
				"FORMAL-ARGUMENTS"
			]
		],
		"if": [
			"push", [ 
				"NIL-ACTION",
				"FORMAL-ARGUMENTS" 
			]
		],
		"left_paren": [
			"push", [
				"NIL-ACTION",
				"FORMAL-ARGUMENTS" 
			]
		],
		"number": [
			"push", [ 
				"NIL-ACTION",
				"FORMAL-ARGUMENTS" 
			]	
		],
		"true": [
			"push", [ 
				"NIL-ACTION",
				"FORMAL-ARGUMENTS" 
			]
		],
		"false": [
			"push", [ 
				"NIL-ACTION",
				"FORMAL-ARGUMENTS" 
			]	
		]	
	},
	"FORMAL-ARGUMENTS": {
		"right_paren": [ ],
		"not": [
			"push", [
				"EXPRESSION",
				"LIST-ACTION",
				"FORMAL-ARGUMENTS-2"
			]
		],
		"minus": [
			"push", [
				"EXPRESSION",
				"LIST-ACTION",
				"FORMAL-ARGUMENTS-2"
			]	
		],
		"identifier": [
			"push", [
				"EXPRESSION",
				"LIST-ACTION",
				"FORMAL-ARGUMENTS-2"
			]	
		],
		"if": [
			"push", [
				"EXPRESSION",
				"LIST-ACTION",
				"FORMAL-ARGUMENTS-2"
			]
		],
		"left_paren": [
			"push", [
				"EXPRESSION",
				"LIST-ACTION",
				"FORMAL-ARGUMENTS-2"
			]
		],
		"number": [
			"push", [
				"EXPRESSION",
				"LIST-ACTION",
				"FORMAL-ARGUMENTS-2"
			]	
		],
		"true": [
			"push", [
				"EXPRESSION",
				"LIST-ACTION",
				"FORMAL-ARGUMENTS-2"
			]
		],
		"false": [
			"push", [
				"EXPRESSION",
				"LIST-ACTION",
				"FORMAL-ARGUMENTS-2"
			]	
		]	
	},
	"FORMAL-ARGUMENTS-2": {
		"comma": [
			"push", [
				"comma",	
				"FORMAL-ARGUMENTS"
			]	
		],
		"right_paren": [ ],
		"function": [ ],
		"equal": [ ],
		"less_than": [ ],
		"end": [ ]
	},
	"LITERAL": {
		"number": [
			"push", [ 
				"number",
				"NUM-ACTION"
			]	
		],
		"true": [
			"push", [ 
				"true",
				"BOOL-ACTION"
			]
		],
		"false": [
			"push", [ 
				"false",
				"BOOL-ACTION"
			]
		]
	}
};


let Parser = (table, scanner, skip, start, end, actions) => {
	let obj = {
		parse: (string) => {
			scanner.init(string);
			let stack = [end, start]; //last state
			let sem_stack = [];

			let p_token = null; //for error messages 
			while(stack.length){

				let [token, value] = scanner.peek();
				while(token != null && skip.some(v => token.type == v)){
					scanner.next();
					[token, value] = scanner.peek();
				}

				if(token == null){
					console.log("scan error after: ", p_token, value);
					break;
				}

				let state = stack.pop();

				if(table[state]){
					if(table[state][token.type] == null){
						console.log("parse error after: ", p_token, value, " unexpected ", token, " expected one of ", table[state]);
						break;
					}

					p_token = token;

					let step = table[state][token.type];

					switch(step[0]){
						case "push":
							stack.push(...step[1].toReversed())
					}
				}else if(actions[state]){
					actions[state](p_token, sem_stack, string);
				}else{
					if(state != token.type){
						console.log(state, ": parse error after: ", p_token, value, " unexpected ", token);
						break;
					}

					p_token = scanner.next()[0];
				}



			}


			if(stack.length != 0)
				return null;

			return sem_stack;
		}
	}

	return obj
}


let ID = (name) => ({type: "ref", name});
let NUM = (value) => ({type: "num", value});
let BOOL = (value) => ({type: "bool", value});

let APP = (func, args) => ({type: "app", func, args});
let IFELSE = (cond, t, e) => ({type: "cond", cond, "then": t, "else": e});
let EQ = (lhs, rhs) => ({type: "equality", lhs, rhs});

let TYPE = (name) => ({type: "type", name});
let DECL = (set, name) => ({type: "type", name, set});
let SEQ = (a, b) => ({type: "seq", expr: [a, b]});
let FUNC_DEF = (name, args, ret, body) => ({type: "func", name, args, ret, body});


let KleinParser = Parser(
	parse_table, 
	KleinScanner, 
	["comment", "white_space"], 
	"PROGRAM", 
	"end", {
		"NIL-ACTION": (tok, stack, str) => stack.push([]),
		"LIST-ACTION": (tok, stack, str) => {
			let v = stack.pop();
			stack.at(-1).push(v);
		},
		"ID-ACTION": (tok, stack, str) => stack.push(ID(str.slice(tok.start, tok.end))),
		"NUM-ACTION": (tok, stack, str) => stack.push(NUM(+str.slice(tok.start, tok.end))),
		"BOOL-ACTION": (tok, stack, str) => stack.push(BOOL(Boolean(str.slice(tok.start, tok.end)))),
		"CALL-ACTION": (tok, stack, str) => stack.push(APP(...[[stack.pop()], stack.pop()].toReversed())),

		"SUB-ACTION": (tok, stack, str) => stack.push(APP(ID("0sub"), 
			[stack.pop(), stack.pop()].toReversed())),
		"MUL-ACTION": (tok, stack, str) => stack.push(APP(ID("0mul"), 
			[stack.pop(), stack.pop()].toReversed())),
		"ADD-ACTION": (tok, stack, str) => stack.push(APP(ID("0add"), 
			[stack.pop(), stack.pop()].toReversed())),
		"DIV-ACTION": (tok, stack, str) => stack.push(APP(ID("0div"), 
			[stack.pop(), stack.pop()].toReversed())),
		"NEG-ACTION": (tok, stack, str) => stack.push(APP(ID("0neg"), 
			[stack.pop()])),
		"LESS_THAN-ACTION": (tok, stack, str) => stack.push(APP(ID("0less_than"), 
			[stack.pop(), stack.pop()].toReversed())),

		"AND-ACTION": (tok, stack, str) => stack.push(APP(ID("0and"), 
			[stack.pop(), stack.pop()].toReversed())),
		"OR-ACTION": (tok, stack, str) => stack.push(APP(ID("0or"), 
			[stack.pop(), stack.pop()].toReversed())),
		"NOT-ACTION": (tok, stack, str) => stack.push(APP(ID("0not"), 
			[stack.pop()])),

		"PRINT-ACTION": (tok, stack, str) => stack.push(APP(ID("0print"), 
			[stack.pop()])),

		"EQUAL-ACTION": (tok, stack, str) => stack.push(EQ(stack.pop(), stack.pop())),

		"IF-ACTION": (tok, stack, str) => stack.push(IFELSE(...[stack.pop(), stack.pop(), stack.pop()].toReversed())),

		"TYPE-ACTION": (tok, stack, str) => stack.push(TYPE(str.slice(tok.start, tok.end))),

		"DECL-ACTION": (tok, stack, str) => stack.push(DECL(stack.pop(), stack.pop())),
		"SEQ-ACTION": (tok, stack, str) => stack.push(SEQ([stack.pop(), stack.pop()].toReversed())),
		"FUNC-ACTION": (tok, stack, str) => stack.push(FUNC_DEF(
			...[stack.pop(), stack.pop(), stack.pop(), stack.pop()].toReversed()))
	});
