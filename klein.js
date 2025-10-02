
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
		"function": [ "push", [ "DEFINITION-LIST" ] ],
		"end": [ "reduce" ]
	},
	"DEFINITION-LIST": {
		"function": [
			"push", [
				"DEFINITION",
				"DEFINITION-LIST"
			]
		],
		"end": [ "reduce" ]
	},
	"DEFINITION": {
		"function": [
			"push", [
				"function",
			       	"identifier",
			       	"left_paren",
			       	"PARAMETER-LIST",
			       	"right_paren",
			       	"colon",
			       	"TYPE", 
				"BODY"
			]
		]
	},
	"PARAMETER-LIST": {
		"identifier": [
			"push", [ "FORMAL-PARAMETERS" ]
		],
		"right_paren": [ "reduce" ]
	},
	"FORMAL-PARAMETERS": {
		"identifier": [
			"push", [
				"ID-WITH-TYPE",
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
		"right_paren": [ "reduce" ]
	},
	"ID-WITH-TYPE": {
		"identifier": [
			"push", [
				"identifier",
				"colon", 
				"TYPE"
			]	
		]
	},
	"TYPE": {
		"boolean": [ "push", [ "boolean" ] ],
		"integer": [ "push", [ "integer" ] ]
	},
	"BODY": {
		"print": [
			"push", [
				"PRINT-EXPRESSION",
				"BODY"
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
			"push", [ "EXPRESSION"	]
		],
		"left_paren": [
			"push", [ "EXPRESSION" ]
		],
		"number": [
			"push", [ "EXPRESSION"]	
		],
		"true": [
			"push", [ "EXPRESSION"]
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
				"right_paren"
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
				"EXPRESSION"
			]
		],
		"less_than": [
			"push", [
				"less_than",
				"EXPRESSION"
			]
		],
		"comma": [ "reduce" ],
		"then": [ "reduce" ],
		"else": [ "reduce" ],
		"right_paren": [ "reduce" ],
		"function": [ "reduce" ],
		"end": [ "reduce" ]
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
				"SIMPLE-EXPRESSION"
			]
		],
		"plus": [
			"push", [
				"plus",
				"SIMPLE-EXPRESSION"
			]
		],
		"minus": [
			"push", [
				"minus",
				"SIMPLE-EXPRESSION"
			]
		],
		"comma": [ "reduce" ],
		"then": [ "reduce" ],
		"else": [ "reduce" ],
		"right_paren": [ "reduce" ],
		"function": [ "reduce" ],
		"equal": [ "reduce" ],
		"less_than": [ "reduce" ],
		"end": [ "reduce" ]
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
				"TERM"
			]
		],
		"slash": [
			"push", [
				"slash",
				"TERM"
			]
		],
		"and": [
			"push", [
				"and",
				"TERM"
			]
		],
		"comma": [ "reduce" ],
		"then": [ "reduce" ],
		"else": [ "reduce" ],
		"right_paren": [ "reduce" ],
		"function": [ "reduce" ],
		"equal": [ "reduce" ],
		"less_than": [ "reduce" ],
		"or": [ "reduce" ],
		"plus": [ "reduce" ],
		"minus": [ "reduce" ],
		"end": [ "reduce" ]
	},
	"FACTOR": {
		"not": [
			"push", [
				"not",
				"FACTOR"
			]
		],
		"minus": [
			"push", [
				"minus",
				"FACTOR"
			]	
		],
		"identifier": [
			"push", [
				"identifier",
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
				"EXPRESSION"
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

		"comma": [ "reduce" ],
		"then": [ "reduce" ],
		"else": [ "reduce" ],
		"right_paren": [ "reduce" ],
		"function": [ "reduce" ],
		"equal": [ "reduce" ],
		"less_than": [ "reduce" ],
		"or": [ "reduce" ],
		"plus": [ "reduce" ],
		"minus": [ "reduce" ],
		"star": [ "reduce" ],
		"slash": [ "reduce" ],
		"and": [ "reduce" ],
		"null": [ "reduce" ]
	},
	"FACTOR-2": {
		"left_paren": [
			"push", [
				"left_paren",
				"ARGUMENT-LIST",
				"right_paren"
			]
		],
		"comma": [ "reduce" ],
		"then": [ "reduce" ],
		"else": [ "reduce" ],
		"right_paren": [ "reduce" ],
		"function": [ "reduce" ],
		"equal": [ "reduce" ],
		"less_than": [ "reduce" ],
		"or": [ "reduce" ],
		"plus": [ "reduce" ],
		"minus": [ "reduce" ],
		"star": [ "reduce" ],
		"slash": [ "reduce" ],
		"and": [ "reduce" ],
		"end": [ "reduce" ]
	},

	"ARGUMENT-LIST": {
		"right_paren": [ "reduce" ],
		"not": [
			"push", [ "FORMAL-ARGUMENTS" ]
		],
		"minus": [
			"push", [ "FORMAL-ARGUMENTS" ]	
		],
		"identifier": [
			"push", [ "FORMAL-ARGUMENTS" ]	
		],
		"if": [
			"push", [ "FORMAL-ARGUMENTS" ]
		],
		"left_paren": [
			"push", [ "FORMAL-ARGUMENTS" ]
		],
		"number": [
			"push", [ "FORMAL-ARGUMENTS" ]	
		],
		"true": [
			"push", [ "FORMAL-ARGUMENTS" ]
		],
		"false": [
			"push", [ "FORMAL-ARGUMENTS" ]	
		]	
	},
	"FORMAL-ARGUMENTS": {
		"right_paren": [ "reduce" ],
		"not": [
			"push", [
				"EXPRESSION",
				"FORMAL-ARGUMENTS-2"
			]
		],
		"minus": [
			"push", [
				"EXPRESSION",
				"FORMAL-ARGUMENTS-2"
			]	
		],
		"identifier": [
			"push", [
				"EXPRESSION",
				"FORMAL-ARGUMENTS-2"
			]	
		],
		"if": [
			"push", [
				"EXPRESSION",
				"FORMAL-ARGUMENTS-2"
			]
		],
		"left_paren": [
			"push", [
				"EXPRESSION",
				"FORMAL-ARGUMENTS-2"
			]
		],
		"number": [
			"push", [
				"EXPRESSION",
				"FORMAL-ARGUMENTS-2"
			]	
		],
		"true": [
			"push", [
				"EXPRESSION",
				"FORMAL-ARGUMENTS-2"
			]
		],
		"false": [
			"push", [
				"EXPRESSION",
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
		"right_paren": [ "reduce" ],
		"function": [ "reduce" ],
		"equal": [ "reduce" ],
		"less_than": [ "reduce" ],
		"end": [ "reduce" ]
	},
	"LITERAL": {
		"number": [
			"push", [ "number" ]	
		],
		"true": [
			"push", [ "true" ]
		],
		"false": [
			"push", [ "false" ]
		]
	}
};


let Parser = (table, scanner, skip) => {
	let obj = {
		parse: (string) => {
			scanner.init(string);
			let stack = ["end", "PROGRAM"]; //last state

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
						case "reduce":
							; //TODO
					}
				}else{
					if(state != token.type){
						console.log("parse error after: ", p_token, value, " unexpected ", token);
						break;
					}

					scanner.next();


					//TODO
				}



			}


			if(stack.length != 0)
				return null;
		}
	}

	return obj
}


let KleinParser = Parser(parse_table, KleinScanner, ["comment", "white_space"]);
