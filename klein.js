
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
		  S("white_space", char_transition("\r\n\t\f\v ", "white_space")))
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
		  "plus":"plus", "minus":"minus", "star":"start", "slash":"slash",
		  "less_than":"less_than", "equal":"equal", "white_space":"white_space",
		  "i": "identifier",
		  "t": "identifier",
		  "f": "identifier",

		  ...Object.fromEntries(Array(keyword_states).fill()
			  .map((v, i) => ["kstate " + i, "identifier"]))
		};

		if(token_states[state.name])
			return Token(token_states[state.name], start_line, end_line, start, end);

		return null;
	});
}





