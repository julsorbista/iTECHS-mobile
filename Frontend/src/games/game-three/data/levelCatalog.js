const CONCEPT_POOL = Object.freeze([
  // ── Tier 1 · Core Data Types ────────────────────────────────────────────────
  {
    id: 'variable',
    label: 'Variable',
    accent: '#34d399',
    cardArt: 'variable',
    questionEasy: {
      prompt: 'What is a variable in programming?',
      options: [
        { id: 'a', label: 'A named storage location that holds a value' },
        { id: 'b', label: 'A function that returns a fixed number' },
        { id: 'c', label: 'A type of computer hardware' },
        { id: 'd', label: 'A loop that runs forever' },
      ],
      correctChoiceVariations: [
        'A named storage location that holds a value',
        'A labeled container for storing data',
        'A named value holder used in code',
        'A place in a program where a value is stored',
        'A name that refers to stored data',
        'A reusable name for a value in memory',
        'A storage spot that can be read by name',
        'A container whose value can be used later',
        'A named data holder that a program can update',
        'A label connected to a value in a program',
      ],
      correctOptionId: 'a',
      hints: [
        'Think of it as a labeled box for data.',
        'Its value can be read and updated by name.',
      ],
      explanation: 'A variable is a named storage location that holds a value. The value can be read, reassigned, and referenced anywhere in scope.',
    },
    questionHard: {
      prompt: 'Which Java statement correctly declares and initializes an integer variable?',
      options: [
        { id: 'a', label: 'int count = 0;' },
        { id: 'b', label: 'count int = 0;' },
        { id: 'c', label: 'int count; count == 0;' },
        { id: 'd', label: 'variable count = 0;' },
      ],
      correctOptionId: 'a',
      hints: [
        'Java requires the type name before the variable name.',
        'Initialization uses a single = sign, not ==.',
      ],
      explanation: 'In Java, declaration follows type → name → value: int count = 0; The type comes first, = assigns the initial value, and a semicolon terminates the statement.',
    },
  },
  {
    id: 'boolean',
    label: 'Boolean',
    accent: '#10b981',
    cardArt: 'boolean',
    questionEasy: {
      prompt: 'What values can a boolean hold?',
      options: [
        { id: 'a', label: 'true or false only' },
        { id: 'b', label: 'Any whole number' },
        { id: 'c', label: 'Any text string' },
        { id: 'd', label: 'null only' },
      ],
      correctChoiceVariations: [
        'true or false only',
        'Only the values true and false',
        'A value that is either true or false',
        'One of two logical states',
        'A yes-or-no style logic value',
        'A data type with exactly two possible values',
        'A logical value used by conditions',
        'Either true or false, nothing else',
        'A binary logic value',
        'The two boolean literals: true and false',
      ],
      correctOptionId: 'a',
      hints: [
        'It has exactly two possible states.',
        'Conditionals depend on this type.',
      ],
      explanation: 'A boolean is a primitive type that holds one of two values: true or false. It is the foundation of all conditional and logical operations.',
    },
    questionHard: {
      prompt: 'What is the value of: boolean result = (10 > 5) && (3 < 2);',
      options: [
        { id: 'a', label: 'false — because (3 < 2) is false' },
        { id: 'b', label: 'true — because (10 > 5) is true' },
        { id: 'c', label: 'Compile error' },
        { id: 'd', label: 'null' },
      ],
      correctOptionId: 'a',
      hints: [
        '&& requires BOTH sides to be true.',
        'Evaluate each side separately first.',
      ],
      explanation: '(10 > 5) is true but (3 < 2) is false. The && (AND) operator returns true only when both operands are true, so the overall result is false.',
    },
  },
  {
    id: 'string',
    label: 'String',
    accent: '#06b6d4',
    cardArt: 'string',
    questionEasy: {
      prompt: 'What is a String in Java?',
      options: [
        { id: 'a', label: 'A sequence of characters' },
        { id: 'b', label: 'A whole number' },
        { id: 'c', label: 'A true/false value' },
        { id: 'd', label: 'A function name' },
      ],
      correctOptionId: 'a',
      hints: [
        'It often appears between double quotes.',
        'Letters, digits, and symbols can live inside it.',
      ],
      explanation: 'A String is an ordered sequence of characters used to represent text. In Java it is written between double quotes, e.g. "Hello".',
    },
    questionHard: {
      prompt: 'In Java, what does "Hello" + " " + "World" produce?',
      options: [
        { id: 'a', label: '"Hello World" — concatenation joins the parts' },
        { id: 'b', label: 'A compile error' },
        { id: 'c', label: '"HelloWorld" with no space' },
        { id: 'd', label: 'null' },
      ],
      correctOptionId: 'a',
      hints: [
        'The + operator concatenates Strings.',
        'Each + merges adjacent Strings in order.',
      ],
      explanation: 'The + operator concatenates Strings. "Hello" + " " + "World" joins all three parts in order, producing "Hello World".',
    },
  },
  {
    id: 'int',
    label: 'Int',
    accent: '#3b82f6',
    cardArt: 'int',
    questionEasy: {
      prompt: 'What does the int data type represent in Java?',
      options: [
        { id: 'a', label: 'A whole number (no decimal point)' },
        { id: 'b', label: 'A decimal number' },
        { id: 'c', label: 'A text string' },
        { id: 'd', label: 'A true/false value' },
      ],
      correctOptionId: 'a',
      hints: [
        'It cannot store fractions.',
        'Examples: -5, 0, 42, 1000.',
      ],
      explanation: 'int is a 32-bit integer type that stores whole numbers with no fractional part. Its range is -2,147,483,648 to 2,147,483,647.',
    },
    questionHard: {
      prompt: 'What is the range of Java\'s int data type?',
      options: [
        { id: 'a', label: '-2,147,483,648 to 2,147,483,647' },
        { id: 'b', label: '-32,768 to 32,767' },
        { id: 'c', label: '0 to 65,535' },
        { id: 'd', label: 'Any size whole number with no upper bound' },
      ],
      correctOptionId: 'a',
      hints: [
        'int uses 32 bits.',
        'The range is roughly ±2 billion.',
      ],
      explanation: 'Java\'s int is a 32-bit signed integer. Its maximum is 2^31 - 1 = 2,147,483,647 and its minimum is -2^31 = -2,147,483,648.',
    },
  },
  {
    id: 'float',
    label: 'Float',
    accent: '#8b5cf6',
    cardArt: 'float',
    questionEasy: {
      prompt: 'What is a float in Java?',
      options: [
        { id: 'a', label: 'A number that can hold a decimal point' },
        { id: 'b', label: 'A whole number only' },
        { id: 'c', label: 'A sequence of characters' },
        { id: 'd', label: 'A boolean value' },
      ],
      correctOptionId: 'a',
      hints: [
        'It can represent fractions like 3.14.',
        'It is less precise than double.',
      ],
      explanation: 'float is a 32-bit floating-point type that can represent numbers with decimal points. In Java you mark float literals with the suffix f, e.g. 3.14f.',
    },
    questionHard: {
      prompt: 'Why is float usually unsuitable for precise financial calculations?',
      options: [
        { id: 'a', label: 'Binary fractions cannot exactly represent some decimals, causing rounding errors' },
        { id: 'b', label: 'float can only hold positive numbers' },
        { id: 'c', label: 'float is an integer type internally' },
        { id: 'd', label: 'float values cannot be compared with ==' },
      ],
      correctOptionId: 'a',
      hints: [
        'Think about how 0.1 is stored in binary.',
        'Use BigDecimal for money calculations instead.',
      ],
      explanation: 'float uses binary fractions, and many decimal values (e.g. 0.1) have no exact binary representation. This creates tiny rounding errors that compound in financial math — use BigDecimal instead.',
    },
  },
  // ── Tier 2 · Control Flow Basics ────────────────────────────────────────────
  {
    id: 'array',
    label: 'Array',
    accent: '#f59e0b',
    cardArt: 'array',
    questionEasy: {
      prompt: 'What is an array?',
      options: [
        { id: 'a', label: 'An ordered collection of elements accessed by index' },
        { id: 'b', label: 'A single value' },
        { id: 'c', label: 'A class definition' },
        { id: 'd', label: 'A conditional statement' },
      ],
      correctOptionId: 'a',
      hints: [
        'Position matters — elements are numbered from 0.',
        'You access each element using a numeric index.',
      ],
      explanation: 'An array stores multiple values in order. Each element has an index starting at 0, used to read or write that element.',
    },
    questionHard: {
      prompt: 'For int[] arr = {10, 20, 30}, what is arr[0]?',
      options: [
        { id: 'a', label: '10 — arrays are zero-indexed' },
        { id: 'b', label: '20' },
        { id: 'c', label: '30' },
        { id: 'd', label: 'Throws ArrayIndexOutOfBoundsException' },
      ],
      correctOptionId: 'a',
      hints: [
        'Java arrays start at index 0.',
        'arr[0] is always the first element.',
      ],
      explanation: 'Java arrays are zero-indexed, so arr[0] is the first element — 10. arr[1] is 20 and arr[2] is 30. Accessing arr[3] would throw an exception.',
    },
  },
  {
    id: 'condition',
    label: 'Condition',
    accent: '#6366f1',
    cardArt: 'condition',
    questionEasy: {
      prompt: 'What does an if/else conditional statement do?',
      options: [
        { id: 'a', label: 'Runs different code based on whether a test is true or false' },
        { id: 'b', label: 'Repeats code multiple times' },
        { id: 'c', label: 'Defines a class' },
        { id: 'd', label: 'Stores a value in memory' },
      ],
      correctOptionId: 'a',
      hints: [
        'It branches the program at a decision point.',
        'A boolean test decides which path runs.',
      ],
      explanation: 'An if/else statement evaluates a boolean condition and runs the if-block when true or the else-block when false, branching program execution.',
    },
    questionHard: {
      prompt: 'Which Java construct is best for checking a single variable against many fixed values?',
      options: [
        { id: 'a', label: 'switch statement' },
        { id: 'b', label: 'while loop' },
        { id: 'c', label: 'for loop' },
        { id: 'd', label: 'try/catch block' },
      ],
      correctOptionId: 'a',
      hints: [
        'Each branch corresponds to one possible value.',
        'It often replaces a long if-else if chain.',
      ],
      explanation: 'A switch statement tests one variable against multiple constant cases, producing cleaner, more readable code than a long if-else if chain.',
    },
  },
  {
    id: 'looping',
    label: 'Looping',
    accent: '#ec4899',
    cardArt: 'looping',
    questionEasy: {
      prompt: 'What is the purpose of a loop?',
      options: [
        { id: 'a', label: 'To repeat a block of code multiple times' },
        { id: 'b', label: 'To store data in memory' },
        { id: 'c', label: 'To define a method' },
        { id: 'd', label: 'To import a class' },
      ],
      correctOptionId: 'a',
      hints: [
        'It is the opposite of running code exactly once.',
        'Common forms: for, while, do-while.',
      ],
      explanation: 'A loop repeats a block of code as long as a condition holds. Common loop types in Java are for, while, do-while, and for-each.',
    },
    questionHard: {
      prompt: 'What is the key difference between a while loop and a do-while loop?',
      options: [
        { id: 'a', label: 'do-while always executes its body at least once; while may not execute at all' },
        { id: 'b', label: 'while loops cannot use a break statement' },
        { id: 'c', label: 'do-while only works with boolean variables' },
        { id: 'd', label: 'They are completely identical' },
      ],
      correctOptionId: 'a',
      hints: [
        'Think about when each loop checks its condition.',
        'do-while checks the condition after the body runs.',
      ],
      explanation: 'A do-while loop checks its condition after executing the body, guaranteeing at least one execution. A while loop checks before, so it may run zero times.',
    },
  },
  {
    id: 'return',
    label: 'Return',
    accent: '#14b8a6',
    cardArt: 'return',
    questionEasy: {
      prompt: 'What does a return statement do in a method?',
      options: [
        { id: 'a', label: 'Sends a value back to the caller and exits the method' },
        { id: 'b', label: 'Stops the entire program immediately' },
        { id: 'c', label: 'Prints a value to the screen' },
        { id: 'd', label: 'Declares a new variable' },
      ],
      correctOptionId: 'a',
      hints: [
        'The value it sends back is called the return value.',
        'Execution leaves the method as soon as return runs.',
      ],
      explanation: 'A return statement exits the current method and optionally passes a value back to the caller. In a void method, return; exits with no value.',
    },
    questionHard: {
      prompt: 'Can a void method in Java contain a return statement?',
      options: [
        { id: 'a', label: 'Yes — a bare return; with no value is allowed and exits early' },
        { id: 'b', label: 'No — void methods cannot have any return statement' },
        { id: 'c', label: 'Yes — and it can return any value' },
        { id: 'd', label: 'Only if the method throws an exception first' },
      ],
      correctOptionId: 'a',
      hints: [
        'void means no return value, not no return statement.',
        'A bare return; is different from return someValue;.',
      ],
      explanation: 'A void method can use return; (with no value) to exit early. Returning a value in a void method is a compile error, but an empty return statement is valid.',
    },
  },
  // ── Tier 3 · Method Anatomy ─────────────────────────────────────────────────
  {
    id: 'method',
    label: 'Method',
    accent: '#0ea5e9',
    cardArt: 'method',
    questionEasy: {
      prompt: 'What is a method in Java?',
      options: [
        { id: 'a', label: 'A named block of code that belongs to a class and performs a task' },
        { id: 'b', label: 'A type of variable' },
        { id: 'c', label: 'A keyword for creating loops' },
        { id: 'd', label: 'A data structure for storing items' },
      ],
      correctOptionId: 'a',
      hints: [
        'It can accept inputs (parameters) and may return a value.',
        'Calling it runs its body.',
      ],
      explanation: 'A method is a named, reusable block of code attached to a class. You define it once and call it wherever needed, optionally passing arguments and receiving a return value.',
    },
    questionHard: {
      prompt: 'What is method overloading in Java?',
      options: [
        { id: 'a', label: 'Defining multiple methods with the same name but different parameter lists' },
        { id: 'b', label: 'Calling a method more than once in the same class' },
        { id: 'c', label: 'A method that calls itself recursively' },
        { id: 'd', label: 'Replacing a parent class method in a subclass' },
      ],
      correctOptionId: 'a',
      hints: [
        'The methods share a name but differ in parameter type or count.',
        'The compiler picks the right one based on the arguments you pass.',
      ],
      explanation: 'Method overloading lets you define multiple methods with the same name but different signatures (different number or types of parameters). The compiler resolves which to call at compile time.',
    },
  },
  {
    id: 'parameter',
    label: 'Parameter',
    accent: '#f97316',
    cardArt: 'parameter',
    questionEasy: {
      prompt: 'What is a parameter in a method definition?',
      options: [
        { id: 'a', label: 'A named input the method expects when it is called' },
        { id: 'b', label: 'The method\'s return type' },
        { id: 'c', label: 'The method\'s body code' },
        { id: 'd', label: 'A built-in keyword' },
      ],
      correctOptionId: 'a',
      hints: [
        'It is declared in the method signature.',
        'The caller supplies a value called an argument.',
      ],
      explanation: 'A parameter is a named placeholder in a method\'s signature. When the method is called, the caller provides an argument that fills that slot.',
    },
    questionHard: {
      prompt: 'In Java, objects are passed by value. What does this mean in practice?',
      options: [
        { id: 'a', label: 'A copy of the reference is passed — the original object can be mutated but not reassigned from inside' },
        { id: 'b', label: 'A full deep copy of the object is made' },
        { id: 'c', label: 'The original object is always destroyed after the call' },
        { id: 'd', label: 'Objects cannot be passed as method parameters' },
      ],
      correctOptionId: 'a',
      hints: [
        'Java passes the reference value, not the object itself.',
        'Mutating fields on the object works; pointing the parameter at a new object does not affect the original.',
      ],
      explanation: 'Java passes a copy of the object\'s reference. Methods can mutate the object\'s fields through that reference, but reassigning the parameter variable does not affect the original caller variable.',
    },
  },
  {
    id: 'argument',
    label: 'Argument',
    accent: '#84cc16',
    cardArt: 'argument',
    questionEasy: {
      prompt: 'What is an argument in a method call?',
      options: [
        { id: 'a', label: 'The actual value supplied to a method when it is called' },
        { id: 'b', label: 'The method\'s return value' },
        { id: 'c', label: 'A variable declared inside the method body' },
        { id: 'd', label: 'The name of the method' },
      ],
      correctOptionId: 'a',
      hints: [
        'It is supplied at the call site, not in the definition.',
        'It fills the corresponding parameter slot.',
      ],
      explanation: 'An argument is a concrete value (or expression) passed to a method at the call site. It fills the corresponding parameter defined in the method signature.',
    },
    questionHard: {
      prompt: 'In void add(int a, int b), when called as add(3, 7) — what are 3 and 7?',
      options: [
        { id: 'a', label: 'Arguments — a and b are the parameters' },
        { id: 'b', label: 'Parameters — a and b are the arguments' },
        { id: 'c', label: 'Both are parameters' },
        { id: 'd', label: 'Both are arguments' },
      ],
      correctOptionId: 'a',
      hints: [
        'Parameters live in the method definition.',
        'Arguments live at the call site.',
      ],
      explanation: 'a and b are the parameters (defined in the signature). 3 and 7 are the arguments (supplied at the call site). Parameters are placeholders; arguments are the actual values.',
    },
  },
  {
    id: 'code_block',
    label: 'Code Block',
    accent: '#a855f7',
    cardArt: 'code_block',
    questionEasy: {
      prompt: 'What is a code block in Java?',
      options: [
        { id: 'a', label: 'Code enclosed in curly braces {} that defines a scope' },
        { id: 'b', label: 'A comment inside the source file' },
        { id: 'c', label: 'A type of loop' },
        { id: 'd', label: 'A single statement ending with a semicolon' },
      ],
      correctOptionId: 'a',
      hints: [
        'It starts with { and ends with }.',
        'Variables declared inside are local to it.',
      ],
      explanation: 'A code block is a group of statements between { and } that forms its own scope. Used in methods, loops, conditionals, and classes.',
    },
    questionHard: {
      prompt: 'What happens to a variable declared inside a code block once the block ends?',
      options: [
        { id: 'a', label: 'It goes out of scope and is no longer accessible' },
        { id: 'b', label: 'It becomes a global variable accessible everywhere' },
        { id: 'c', label: 'It retains its value in the outer scope' },
        { id: 'd', label: 'It throws a NullPointerException' },
      ],
      correctOptionId: 'a',
      hints: [
        'The variable\'s lifetime matches the block it lives in.',
        'This is called block scope.',
      ],
      explanation: 'Variables declared inside a block are scoped to that block. When execution leaves the block the variable goes out of scope — any attempt to access it outside is a compile error.',
    },
  },
  {
    id: 'semi_colon',
    label: 'Semicolon',
    accent: '#fbbf24',
    cardArt: 'semi_colon',
    questionEasy: {
      prompt: 'What role does a semicolon play in Java?',
      options: [
        { id: 'a', label: 'It terminates a statement' },
        { id: 'b', label: 'It starts a comment' },
        { id: 'c', label: 'It defines a code block' },
        { id: 'd', label: 'It calls a method' },
      ],
      correctOptionId: 'a',
      hints: [
        'Almost every statement in Java ends with one.',
        'Missing one causes a compile error.',
      ],
      explanation: 'In Java, a semicolon marks the end of a statement — declarations, assignments, method calls, return statements, and more all require one.',
    },
    questionHard: {
      prompt: 'Which Java construct does NOT require a semicolon to close it?',
      options: [
        { id: 'a', label: 'The closing } brace of a for loop body' },
        { id: 'b', label: 'A variable declaration like int x = 5' },
        { id: 'c', label: 'A method call like System.out.println()' },
        { id: 'd', label: 'A return statement' },
      ],
      correctOptionId: 'a',
      hints: [
        'Closing braces end blocks, not statements.',
        'Statements need semicolons; block delimiters do not.',
      ],
      explanation: 'The } that closes a block (if-body, for-body, method body, etc.) is a block delimiter, not a statement, so it does not need a semicolon after it.',
    },
  },
  {
    id: 'parentheses',
    label: 'Parentheses',
    accent: '#fb7185',
    cardArt: 'parentheses',
    questionEasy: {
      prompt: 'What are parentheses () used for in Java?',
      options: [
        { id: 'a', label: 'Grouping expressions, calling methods, and defining method parameters' },
        { id: 'b', label: 'Defining a code block' },
        { id: 'c', label: 'Ending a statement' },
        { id: 'd', label: 'Writing a comment' },
      ],
      correctOptionId: 'a',
      hints: [
        'You see them in method signatures and call sites.',
        'They also control operator precedence in expressions.',
      ],
      explanation: 'Parentheses serve multiple roles in Java: they define parameter lists in method declarations, provide arguments at call sites, and group sub-expressions to control evaluation order.',
    },
    questionHard: {
      prompt: 'What does System.out.println(2 + 3 * 4) print?',
      options: [
        { id: 'a', label: '14 — multiplication runs before addition' },
        { id: 'b', label: '20 — evaluated strictly left to right' },
        { id: 'c', label: 'Compile error' },
        { id: 'd', label: '24' },
      ],
      correctOptionId: 'a',
      hints: [
        '* has higher precedence than +.',
        '3 * 4 is evaluated first, then 2 is added.',
      ],
      explanation: 'Operator precedence: * runs before +. So 3 * 4 = 12 first, then 2 + 12 = 14. To force left-to-right you would write (2 + 3) * 4 = 20.',
    },
  },
  // ── Tier 4 · OOP Basics ─────────────────────────────────────────────────────
  {
    id: 'class',
    label: 'Class',
    accent: '#22c55e',
    cardArt: 'class',
    questionEasy: {
      prompt: 'What is a class in Java?',
      options: [
        { id: 'a', label: 'A blueprint that defines the structure and behavior of objects' },
        { id: 'b', label: 'A reserved word for ending a loop' },
        { id: 'c', label: 'A single numeric value type' },
        { id: 'd', label: 'A comment style' },
      ],
      correctOptionId: 'a',
      hints: [
        'Objects are created (instantiated) from it.',
        'Think blueprint, not building.',
      ],
      explanation: 'A class is a template that defines the fields and methods all its objects will share. Creating an object from a class is called instantiation.',
    },
    questionHard: {
      prompt: 'What is the key difference between an abstract class and a regular class in Java?',
      options: [
        { id: 'a', label: 'Abstract classes cannot be instantiated and may declare abstract methods without a body' },
        { id: 'b', label: 'Abstract classes cannot have any fields' },
        { id: 'c', label: 'Regular classes cannot have constructors' },
        { id: 'd', label: 'Abstract classes must implement all interface methods' },
      ],
      correctOptionId: 'a',
      hints: [
        'You cannot do new AbstractClass().',
        'Abstract methods leave the implementation to subclasses.',
      ],
      explanation: 'An abstract class cannot be instantiated directly. It may contain abstract methods (no body) that subclasses must implement, as well as concrete methods with bodies.',
    },
  },
  {
    id: 'object',
    label: 'Object',
    accent: '#0891b2',
    cardArt: 'object',
    questionEasy: {
      prompt: 'What is an object in object-oriented programming?',
      options: [
        { id: 'a', label: 'An instance of a class that holds state and behavior' },
        { id: 'b', label: 'A primitive data type' },
        { id: 'c', label: 'A keyword for ending a method' },
        { id: 'd', label: 'A type of loop' },
      ],
      correctOptionId: 'a',
      hints: [
        'It is created from a class.',
        'It has both data (fields) and actions (methods).',
      ],
      explanation: 'An object is a concrete instance of a class. It bundles state (field values) with behavior (methods) and is created with the new keyword.',
    },
    questionHard: {
      prompt: 'How do you create an object from a class called Car in Java?',
      options: [
        { id: 'a', label: 'Car myCar = new Car();' },
        { id: 'b', label: 'Car myCar = Car();' },
        { id: 'c', label: 'object Car myCar = new Car();' },
        { id: 'd', label: 'new myCar = Car();' },
      ],
      correctOptionId: 'a',
      hints: [
        'Java uses the new keyword to allocate an object.',
        'The syntax is: Type name = new Type();',
      ],
      explanation: 'In Java, objects are created with new: Car myCar = new Car(); This allocates memory, runs the constructor, and returns a reference stored in myCar.',
    },
  },
  {
    id: 'import',
    label: 'Import',
    accent: '#7c3aed',
    cardArt: 'import',
    questionEasy: {
      prompt: 'What does an import statement do in Java?',
      options: [
        { id: 'a', label: 'Brings a class or package into scope so it can be used without the full name' },
        { id: 'b', label: 'Exports a class to another file' },
        { id: 'c', label: 'Creates a new class in the project' },
        { id: 'd', label: 'Defines a variable in the global scope' },
      ],
      correctOptionId: 'a',
      hints: [
        'Without it, you must type the full package path every time.',
        'It appears at the top of a Java file.',
      ],
      explanation: 'import tells the compiler where to find a class so you can use its short name. For example, import java.util.Scanner; lets you write Scanner instead of java.util.Scanner.',
    },
    questionHard: {
      prompt: 'What is the main drawback of using a wildcard import like import java.util.*;?',
      options: [
        { id: 'a', label: 'It hides which specific classes are used, making code harder to read and maintain' },
        { id: 'b', label: 'It causes a compile error if any class in the package is missing' },
        { id: 'c', label: 'It imports private inner classes too' },
        { id: 'd', label: 'It significantly slows down compilation' },
      ],
      correctOptionId: 'a',
      hints: [
        '* imports every public class in the package.',
        'Readers cannot tell which classes are actually used.',
      ],
      explanation: 'Wildcard imports pull in all public classes from a package. While convenient, they obscure which classes are actually used, and can cause ambiguity if two packages define a class with the same name.',
    },
  },
  {
    id: 'equality_operator',
    label: 'Equality Operator',
    accent: '#f43f5e',
    cardArt: 'equality_operator',
    questionEasy: {
      prompt: 'What does the == operator check in Java?',
      options: [
        { id: 'a', label: 'Whether two values or references are equal' },
        { id: 'b', label: 'Whether a value has been assigned' },
        { id: 'c', label: 'Whether a method returned true' },
        { id: 'd', label: 'Whether two objects have the same fields' },
      ],
      correctOptionId: 'a',
      hints: [
        'For primitives it compares values; for objects it compares references.',
        'Do not confuse it with the assignment = operator.',
      ],
      explanation: '== tests equality. For primitive types it compares values; for object references it checks if both point to the same memory location.',
    },
    questionHard: {
      prompt: 'In Java, what is the difference between == and .equals() when comparing Strings?',
      options: [
        { id: 'a', label: '== compares references; .equals() compares the actual character content' },
        { id: 'b', label: 'They are identical for all String comparisons' },
        { id: 'c', label: '.equals() checks if the String is null' },
        { id: 'd', label: '== always throws a NullPointerException on Strings' },
      ],
      correctOptionId: 'a',
      hints: [
        'Two String objects can hold the same text but be different objects.',
        'Use .equals() to compare String content.',
      ],
      explanation: '== on Strings tests whether both variables point to the same object in memory. .equals() tests whether the character sequences are identical — this is almost always what you want.',
    },
  },
  {
    id: 'system_println',
    label: 'System.out.println',
    accent: '#65a30d',
    cardArt: 'system_println',
    questionEasy: {
      prompt: 'What does System.out.println() do in Java?',
      options: [
        { id: 'a', label: 'Prints a line of text to the standard output (console)' },
        { id: 'b', label: 'Reads a line of input from the user' },
        { id: 'c', label: 'Saves text to a file' },
        { id: 'd', label: 'Returns a String value to the caller' },
      ],
      correctOptionId: 'a',
      hints: [
        'It is the most common way to display output in Java.',
        'It adds a newline at the end of the output.',
      ],
      explanation: 'System.out.println() writes its argument to standard output (the console) followed by a newline, so the next output starts on a new line.',
    },
    questionHard: {
      prompt: 'What is the key difference between System.out.print() and System.out.println()?',
      options: [
        { id: 'a', label: 'println appends a newline after printing; print does not' },
        { id: 'b', label: 'print can output any type; println only outputs Strings' },
        { id: 'c', label: 'println flushes the output buffer; print never does' },
        { id: 'd', label: 'They are functionally identical' },
      ],
      correctOptionId: 'a',
      hints: [
        'ln in println stands for "line."',
        'After print, the cursor stays on the same line.',
      ],
      explanation: 'println prints the value and then moves the cursor to a new line. print prints the value and leaves the cursor on the same line — the next output will immediately follow.',
    },
  },
  // ── Tier 5 · OOP Pillars ────────────────────────────────────────────────────
  {
    id: 'inheritance',
    label: 'Inheritance',
    accent: '#e879f9',
    cardArt: 'inheritance',
    questionEasy: {
      prompt: 'What is inheritance in OOP?',
      options: [
        { id: 'a', label: 'A subclass acquiring fields and methods from a parent class' },
        { id: 'b', label: 'A way to hide fields from other classes' },
        { id: 'c', label: 'A loop that repeats code' },
        { id: 'd', label: 'A type of conditional statement' },
      ],
      correctOptionId: 'a',
      hints: [
        'It creates a parent-child relationship between classes.',
        'In Java, the extends keyword establishes it.',
      ],
      explanation: 'Inheritance lets a subclass reuse fields and methods of a parent class. The subclass can also override methods or add new ones. In Java: class Dog extends Animal {}.',
    },
    questionHard: {
      prompt: 'Why does Java not support extending multiple classes?',
      options: [
        { id: 'a', label: 'Multiple inheritance can cause ambiguity (the diamond problem) when two parents define the same method' },
        { id: 'b', label: 'It is technically impossible in all languages' },
        { id: 'c', label: 'Java allows it only for abstract classes' },
        { id: 'd', label: 'It would slow runtime performance too much' },
      ],
      correctOptionId: 'a',
      hints: [
        'What happens if both parents have a method with the same name?',
        'Java uses interfaces to achieve multiple-type behavior instead.',
      ],
      explanation: 'Multiple class inheritance leads to the diamond problem: if two parents both define the same method, the subclass has no unambiguous method to inherit. Java solves this by allowing only single class inheritance but multiple interface implementation.',
    },
  },
  {
    id: 'encapsulation',
    label: 'Encapsulation',
    accent: '#0d9488',
    cardArt: 'encapsulation',
    questionEasy: {
      prompt: 'What is encapsulation in OOP?',
      options: [
        { id: 'a', label: 'Bundling data and methods together and restricting direct access to some fields' },
        { id: 'b', label: 'Having multiple classes with the same method name' },
        { id: 'c', label: 'A class inheriting from another class' },
        { id: 'd', label: 'Hiding the entire class from the program' },
      ],
      correctOptionId: 'a',
      hints: [
        'Private fields + public getters/setters is a classic pattern.',
        'It protects an object\'s internal state.',
      ],
      explanation: 'Encapsulation bundles an object\'s data and the methods that operate on it, restricting external access through access modifiers. This protects the object\'s internal state and hides implementation details.',
    },
    questionHard: {
      prompt: 'Which Java access modifier provides the strictest encapsulation for a field?',
      options: [
        { id: 'a', label: 'private — accessible only within the declaring class' },
        { id: 'b', label: 'protected — accessible within the package and subclasses' },
        { id: 'c', label: 'public — accessible everywhere' },
        { id: 'd', label: 'default (no keyword) — accessible within the same package' },
      ],
      correctOptionId: 'a',
      hints: [
        'The strictest modifier allows the fewest access points.',
        'private means only the class itself can touch the field.',
      ],
      explanation: 'private is the most restrictive modifier. A private field or method can only be accessed within the class that declares it, enforcing the tightest possible encapsulation.',
    },
  },
  {
    id: 'polymorphism',
    label: 'Polymorphism',
    accent: '#dc2626',
    cardArt: 'polymorphism',
    questionEasy: {
      prompt: 'What does polymorphism mean in OOP?',
      options: [
        { id: 'a', label: 'The same interface can behave differently depending on the actual object' },
        { id: 'b', label: 'Every class can only have one method' },
        { id: 'c', label: 'A class can extend multiple parent classes' },
        { id: 'd', label: 'All objects of a class must be identical' },
      ],
      correctOptionId: 'a',
      hints: [
        'Greek for "many shapes."',
        'Different classes can respond to the same method call in their own way.',
      ],
      explanation: 'Polymorphism lets different objects respond to the same method call with their own behavior. A method call on a parent-type reference executes the actual subclass\'s version at runtime.',
    },
    questionHard: {
      prompt: 'What is the difference between compile-time and runtime polymorphism in Java?',
      options: [
        { id: 'a', label: 'Compile-time is method overloading; runtime is method overriding via inheritance' },
        { id: 'b', label: 'Compile-time polymorphism requires interfaces; runtime requires abstract classes' },
        { id: 'c', label: 'Runtime polymorphism cannot be used with interfaces' },
        { id: 'd', label: 'Compile-time polymorphism only works with primitive types' },
      ],
      correctOptionId: 'a',
      hints: [
        'One is resolved by the compiler; the other by the JVM at runtime.',
        'Overloading = same name, different signatures. Overriding = same signature in a subclass.',
      ],
      explanation: 'Compile-time polymorphism (static dispatch) is method overloading — the compiler picks the right method. Runtime polymorphism (dynamic dispatch) is method overriding — the JVM decides which subclass implementation to call when the program runs.',
    },
  },
  {
    id: 'abstraction',
    label: 'Abstraction',
    accent: '#9333ea',
    cardArt: 'abstraction',
    questionEasy: {
      prompt: 'What is abstraction in programming?',
      options: [
        { id: 'a', label: 'Hiding complex implementation details and exposing only what is necessary' },
        { id: 'b', label: 'Making all methods public' },
        { id: 'c', label: 'Copying code from one class to another' },
        { id: 'd', label: 'Converting one data type to another' },
      ],
      correctOptionId: 'a',
      hints: [
        'Think of a TV remote — you press a button without knowing the electronics inside.',
        'It simplifies a complex system to its essential interface.',
      ],
      explanation: 'Abstraction hides the complex internal workings and exposes only a clean interface. Users interact with the abstraction without needing to understand the implementation.',
    },
    questionHard: {
      prompt: 'What is a key difference between an abstract class and an interface in Java?',
      options: [
        { id: 'a', label: 'An abstract class can have fields and concrete methods; an interface\'s methods are abstract by default (pre-Java 8)' },
        { id: 'b', label: 'An interface can be instantiated; an abstract class cannot' },
        { id: 'c', label: 'Abstract classes support multiple inheritance; interfaces do not' },
        { id: 'd', label: 'An interface must extend an abstract class' },
      ],
      correctOptionId: 'a',
      hints: [
        'An abstract class is still a class — it can have state.',
        'An interface is a pure contract with no state (before Java 8 default methods).',
      ],
      explanation: 'An abstract class can have instance fields, constructors, and both abstract and concrete methods. A traditional interface only declares method signatures (a contract). Java 8+ added default methods to interfaces.',
    },
  },
  {
    id: 'oop',
    label: 'OOP',
    accent: '#ca8a04',
    cardArt: 'oop',
    questionEasy: {
      prompt: 'What does OOP stand for?',
      options: [
        { id: 'a', label: 'Object-Oriented Programming' },
        { id: 'b', label: 'Ordered Operation Processing' },
        { id: 'c', label: 'Open Output Protocol' },
        { id: 'd', label: 'Object Output Program' },
      ],
      correctOptionId: 'a',
      hints: [
        'It is a paradigm built around objects that bundle data and behavior.',
        'Java, C++, and Python all support it.',
      ],
      explanation: 'OOP (Object-Oriented Programming) is a paradigm that organizes code around objects — entities that combine state (fields) and behavior (methods). Its four pillars are encapsulation, inheritance, polymorphism, and abstraction.',
    },
    questionHard: {
      prompt: 'Which OOP principle is violated when a subclass behaves so differently from its parent that code using the parent breaks when the subclass is substituted?',
      options: [
        { id: 'a', label: 'Liskov Substitution Principle' },
        { id: 'b', label: 'Open-Closed Principle' },
        { id: 'c', label: 'Encapsulation' },
        { id: 'd', label: 'Polymorphism' },
      ],
      correctOptionId: 'a',
      hints: [
        'LSP: subtypes must be substitutable for their parent type without breaking the program.',
        'A Square-extends-Rectangle violation is the classic example.',
      ],
      explanation: 'The Liskov Substitution Principle (LSP) states that a subtype must be usable wherever its parent type is expected without altering the program\'s correctness. Violating it breaks reliable polymorphism.',
    },
  },
  // ── Tier 6 · Advanced Java ───────────────────────────────────────────────────
  {
    id: 'setter_getter',
    label: 'Setter & Getter',
    accent: '#be185d',
    cardArt: 'setter&getter',
    questionEasy: {
      prompt: 'What are getters and setters in Java?',
      options: [
        { id: 'a', label: 'Methods that read (get) and write (set) private fields of a class' },
        { id: 'b', label: 'Constructors for creating objects' },
        { id: 'c', label: 'Loop control statements' },
        { id: 'd', label: 'Methods that catch exceptions' },
      ],
      correctOptionId: 'a',
      hints: [
        'They work together with private fields to support encapsulation.',
        'Getter names usually start with get; setter names with set.',
      ],
      explanation: 'Getters and setters are public methods that read and write private fields. They implement encapsulation by controlling how internal data is accessed and modified.',
    },
    questionHard: {
      prompt: 'Why use a setter method instead of making a field public in Java?',
      options: [
        { id: 'a', label: 'A setter lets you validate or transform the value before storing it' },
        { id: 'b', label: 'Setters are required by the Java compiler for all fields' },
        { id: 'c', label: 'Public fields cannot be inherited by subclasses' },
        { id: 'd', label: 'Setter calls are significantly faster than field access' },
      ],
      correctOptionId: 'a',
      hints: [
        'A setter can enforce constraints like "age must be positive."',
        'A public field gives unrestricted write access.',
      ],
      explanation: 'A setter intercepts writes to a field. You can add validation (e.g., reject negative ages), logging, or computed side effects. A public field provides no such control, making bugs harder to prevent and detect.',
    },
  },
  {
    id: 'switch',
    label: 'Switch',
    accent: '#0369a1',
    cardArt: 'switch',
    questionEasy: {
      prompt: 'What does a switch statement do?',
      options: [
        { id: 'a', label: 'Tests a value against multiple cases and runs the matching block' },
        { id: 'b', label: 'Loops through elements of an array' },
        { id: 'c', label: 'Defines a new class method' },
        { id: 'd', label: 'Imports a package into scope' },
      ],
      correctOptionId: 'a',
      hints: [
        'Each case corresponds to one possible value.',
        'It is an alternative to a long if-else if chain.',
      ],
      explanation: 'A switch statement evaluates an expression and jumps to the matching case label. It is cleaner than many if-else if blocks when checking one value against several constants.',
    },
    questionHard: {
      prompt: 'In Java, what happens if a switch case has no break statement?',
      options: [
        { id: 'a', label: 'Execution falls through to the next case and runs it too' },
        { id: 'b', label: 'The program throws a SwitchException at runtime' },
        { id: 'c', label: 'That case is silently skipped' },
        { id: 'd', label: 'The compiler raises an error' },
      ],
      correctOptionId: 'a',
      hints: [
        'break exits the switch block.',
        'Without break, execution keeps running into the next case.',
      ],
      explanation: 'Without break, Java\'s switch falls through: after the matched case runs, execution continues into the next case regardless of its label. This is sometimes intentional but is a common source of bugs.',
    },
  },
  {
    id: 'api',
    label: 'API',
    accent: '#b45309',
    cardArt: 'api',
    questionEasy: {
      prompt: 'What is an API?',
      options: [
        { id: 'a', label: 'A defined contract that lets different software components communicate' },
        { id: 'b', label: 'A type of database table' },
        { id: 'c', label: 'A built-in Java language feature' },
        { id: 'd', label: 'A loop construct' },
      ],
      correctOptionId: 'a',
      hints: [
        'API stands for Application Programming Interface.',
        'It defines what you can call and what you get back.',
      ],
      explanation: 'An API (Application Programming Interface) is a contract that defines how one piece of software calls another. It specifies the available operations, their inputs, and their outputs.',
    },
    questionHard: {
      prompt: 'What is the key difference between a REST API and a SOAP API?',
      options: [
        { id: 'a', label: 'REST uses lightweight HTTP/JSON; SOAP uses XML with a strict messaging envelope' },
        { id: 'b', label: 'SOAP is always faster than REST' },
        { id: 'c', label: 'REST requires a special client library; SOAP does not' },
        { id: 'd', label: 'They are architecturally identical' },
      ],
      correctOptionId: 'a',
      hints: [
        'REST is an architectural style; SOAP is a protocol.',
        'REST uses standard HTTP verbs like GET and POST.',
      ],
      explanation: 'REST (Representational State Transfer) is a lightweight style that uses HTTP methods and often JSON payloads. SOAP (Simple Object Access Protocol) is a stricter protocol that wraps everything in XML envelopes and enforces a formal contract (WSDL).',
    },
  },
  {
    id: 'java',
    label: 'Java',
    accent: '#15803d',
    cardArt: 'java',
    questionEasy: {
      prompt: 'What is Java?',
      options: [
        { id: 'a', label: 'A general-purpose, object-oriented programming language that runs on the JVM' },
        { id: 'b', label: 'A scripting language for web browsers only' },
        { id: 'c', label: 'A database query language' },
        { id: 'd', label: 'A low-level hardware programming language' },
      ],
      correctOptionId: 'a',
      hints: [
        'It was created by Sun Microsystems in 1995.',
        'Programs compile to bytecode, not native machine code.',
      ],
      explanation: 'Java is a strongly-typed, object-oriented language. Programs compile to JVM bytecode, which runs on any platform with a Java Virtual Machine — enabling the "Write Once, Run Anywhere" promise.',
    },
    questionHard: {
      prompt: 'What does "Write Once, Run Anywhere" mean in Java?',
      options: [
        { id: 'a', label: 'Java bytecode compiled once can run on any platform that has a compatible JVM' },
        { id: 'b', label: 'Java code can only be written in one IDE' },
        { id: 'c', label: 'Java programs always run at the same speed on every machine' },
        { id: 'd', label: 'Java source files never need recompilation after the first build' },
      ],
      correctOptionId: 'a',
      hints: [
        'The JVM (Java Virtual Machine) is the key.',
        'Each OS has its own JVM implementation.',
      ],
      explanation: 'Java source is compiled to platform-independent bytecode. Any operating system with a compatible JVM can execute the same .class files — you do not need to recompile for each target platform.',
    },
  },
  {
    id: 'terminal',
    label: 'Terminal',
    accent: '#1d4ed8',
    cardArt: 'terminal',
    questionEasy: {
      prompt: 'What is a terminal (command line)?',
      options: [
        { id: 'a', label: 'A text-based interface for running commands and programs' },
        { id: 'b', label: 'A graphical window for drawing shapes' },
        { id: 'c', label: 'A type of loop in Java' },
        { id: 'd', label: 'A Java keyword for ending a program' },
      ],
      correctOptionId: 'a',
      hints: [
        'You type commands and press Enter to execute them.',
        'Also called a command prompt, shell, or console.',
      ],
      explanation: 'A terminal (or command line) is a text-based interface where you type commands to interact with the operating system and run programs. Developers use it to compile code, run programs, and manage files.',
    },
    questionHard: {
      prompt: 'Which command compiles a Java source file named Hello.java in the terminal?',
      options: [
        { id: 'a', label: 'javac Hello.java' },
        { id: 'b', label: 'java Hello.java' },
        { id: 'c', label: 'compile Hello.java' },
        { id: 'd', label: 'run Hello.java' },
      ],
      correctOptionId: 'a',
      hints: [
        'javac is the Java compiler; java runs bytecode.',
        'Compiling produces a .class file.',
      ],
      explanation: 'javac Hello.java compiles the source file to Hello.class. You then run it with java Hello (without the extension). java Hello.java would attempt to run the source file directly, which requires Java 11+ and skips explicit compilation.',
    },
  },
  {
    id: 'debugging',
    label: 'Debugging',
    accent: '#b91c1c',
    cardArt: 'debugging',
    questionEasy: {
      prompt: 'What is debugging in programming?',
      options: [
        { id: 'a', label: 'The process of finding and fixing errors in code' },
        { id: 'b', label: 'Writing new features for an application' },
        { id: 'c', label: 'Compiling source code into bytecode' },
        { id: 'd', label: 'Importing external libraries into a project' },
      ],
      correctOptionId: 'a',
      hints: [
        'It often involves stepping through code line by line.',
        'The name comes from removing literal bugs from early computers.',
      ],
      explanation: 'Debugging is the systematic process of identifying and removing errors (bugs) from code. It involves reading error messages, tracing execution, inspecting variable values, and verifying logic.',
    },
    questionHard: {
      prompt: 'What is the difference between a runtime error and a logic error?',
      options: [
        { id: 'a', label: 'A runtime error crashes the program; a logic error produces wrong output without crashing' },
        { id: 'b', label: 'Runtime errors are syntax mistakes; logic errors crash the program' },
        { id: 'c', label: 'Both cause the program to crash in the same way' },
        { id: 'd', label: 'Logic errors are always caught by the compiler' },
      ],
      correctOptionId: 'a',
      hints: [
        'Logic errors are silent — the program runs but gives wrong answers.',
        'Runtime errors throw exceptions that stop execution.',
      ],
      explanation: 'Runtime errors (e.g. NullPointerException) crash the program with an exception. Logic errors let the program run to completion but produce incorrect results — they are often harder to find because there is no error message.',
    },
  },
  {
    id: 'html_tags',
    label: 'HTML Tags',
    accent: '#7e22ce',
    cardArt: 'html_tags',
    questionEasy: {
      prompt: 'What are HTML tags?',
      options: [
        { id: 'a', label: 'Markup elements that define the structure and meaning of web content' },
        { id: 'b', label: 'Java class definitions' },
        { id: 'c', label: 'SQL query keywords' },
        { id: 'd', label: 'CSS styling rules' },
      ],
      correctOptionId: 'a',
      hints: [
        'They are written inside angle brackets: <tag>.',
        'Most come in pairs: an opening tag and a closing tag.',
      ],
      explanation: 'HTML (HyperText Markup Language) tags are elements enclosed in angle brackets that define the structure and semantics of web pages. Most tags come in pairs: an opening tag like <p> and a closing tag like </p>.',
    },
    questionHard: {
      prompt: 'What is the difference between block-level and inline HTML elements?',
      options: [
        { id: 'a', label: 'Block elements start on a new line and expand to full width; inline elements flow within text' },
        { id: 'b', label: 'Block elements are invisible; inline elements are visible' },
        { id: 'c', label: 'Inline elements can always contain block elements but not vice versa' },
        { id: 'd', label: 'They are displayed identically' },
      ],
      correctOptionId: 'a',
      hints: [
        '<div> and <p> are block; <span> and <a> are inline.',
        'A block element forces a line break before and after itself.',
      ],
      explanation: 'Block-level elements (div, p, h1, etc.) start on their own line and stretch to fill the container width. Inline elements (span, a, strong, etc.) sit within the text flow and only take up as much space as their content.',
    },
  },
]);

// ── Internal concept lookup ──────────────────────────────────────────────────
const conceptById = CONCEPT_POOL.reduce((map, concept) => {
  map[concept.id] = concept;
  return map;
}, {});

// ── Level definitions ────────────────────────────────────────────────────────
// Each entry lists the exact concepts for that level plus whether to use the
// hard question variant. No two entries within a level share the same concept id.

const LEVEL_DEFINITIONS = Object.freeze([
  {
    levelNumber: 1,
    title: 'Data Basics',
    subtitle: '4 cards | 2 pairs',
    description: 'Start here — two essential building blocks of every program.',
    columns: 2,
    previewMs: 1400,
    flipBackMs: 1000,
    conceptEntries: [
      { id: 'variable', hard: false },
      { id: 'boolean', hard: false },
    ],
  },
  {
    levelNumber: 2,
    title: 'Value Types',
    subtitle: '6 cards | 3 pairs',
    description: 'Three common data types for storing different kinds of values.',
    columns: 3,
    previewMs: 1300,
    flipBackMs: 980,
    conceptEntries: [
      { id: 'string', hard: false },
      { id: 'int', hard: false },
      { id: 'float', hard: false },
    ],
  },
  {
    levelNumber: 3,
    title: 'Control Flow',
    subtitle: '8 cards | 4 pairs',
    description: 'Arrays, conditions, loops, and the return statement.',
    columns: 4,
    previewMs: 1200,
    flipBackMs: 960,
    conceptEntries: [
      { id: 'array', hard: false },
      { id: 'condition', hard: false },
      { id: 'looping', hard: false },
      { id: 'return', hard: false },
    ],
  },
  {
    levelNumber: 4,
    seedVersion: 6,
    title: 'Method Essentials',
    subtitle: '10 cards | 5 pairs',
    description: 'Core Java concepts used when building and controlling methods.',
    columns: 5,
    previewMs: 3000,
    flipBackMs: 940,
    conceptEntries: [
      { id: 'method', hard: false },
      { id: 'parameter', hard: false },
      { id: 'variable', hard: false },
      { id: 'string', hard: false },
      { id: 'condition', hard: false },
    ],
  },
  {
    levelNumber: 5,
    seedVersion: 3,
    title: 'OOP Intro',
    subtitle: '12 cards | 6 pairs',
    description: 'Classes, objects, and the Java features that bring them to life.',
    columns: 4,
    previewMs: 3000,
    flipBackMs: 920,
    conceptEntries: [
      { id: 'class', hard: false },
      { id: 'object', hard: false },
      { id: 'import', hard: false },
      { id: 'inheritance', hard: false },
      { id: 'encapsulation', hard: false },
      { id: 'polymorphism', hard: false },
    ],
  },
  {
    levelNumber: 6,
    seedVersion: 3,
    title: 'Advanced Concepts',
    subtitle: '12 cards | 6 pairs',
    description: 'Six familiar concepts return with harder, code-level questions.',
    columns: 4,
    previewMs: 3000,
    flipBackMs: 900,
    conceptEntries: [
      { id: 'variable', hard: true },
      { id: 'boolean', hard: true },
      { id: 'string', hard: true },
      { id: 'int', hard: true },
      { id: 'float', hard: true },
      { id: 'array', hard: true },
    ],
  },
  {
    levelNumber: 7,
    seedVersion: 3,
    title: 'Harder Questions I',
    subtitle: '14 cards | 7 pairs',
    description: 'Core concepts return with tougher, code-level questions.',
    columns: 4,
    previewMs: 4000,
    flipBackMs: 880,
    conceptEntries: [
      { id: 'boolean', hard: true },
      { id: 'array', hard: true },
      { id: 'condition', hard: true },
      { id: 'looping', hard: true },
      { id: 'method', hard: true },
      { id: 'parameter', hard: true },
      { id: 'class', hard: true },
    ],
  },
  {
    levelNumber: 8,
    seedVersion: 3,
    title: 'Harder Questions II',
    subtitle: '16 cards | 8 pairs',
    description: 'Syntax and OOP vocabulary tested at a deeper level.',
    columns: 4,
    previewMs: 5000,
    flipBackMs: 860,
    conceptEntries: [
      { id: 'variable', hard: true },
      { id: 'condition', hard: true },
      { id: 'method', hard: true },
      { id: 'parameter', hard: true },
      { id: 'semi_colon', hard: true },
      { id: 'class', hard: true },
      { id: 'object', hard: true },
      { id: 'import', hard: true },
    ],
  },
  {
    levelNumber: 9,
    seedVersion: 3,
    title: 'Full Glossary',
    subtitle: '18 cards | 9 pairs',
    description: 'Nine concepts with tougher questions across core Java topics.',
    columns: 5,
    previewMs: 6000,
    flipBackMs: 840,
    conceptEntries: [
      { id: 'variable', hard: true },
      { id: 'debugging', hard: true },
      { id: 'array', hard: true },
      { id: 'looping', hard: true },
      { id: 'method', hard: true },
      { id: 'class', hard: true },
      { id: 'inheritance', hard: true },
      { id: 'encapsulation', hard: true },
      { id: 'polymorphism', hard: true },
    ],
  },
  {
    levelNumber: 10,
    seedVersion: 3,
    title: 'Master Run',
    subtitle: '20 cards | 10 pairs',
    description: 'The ultimate challenge: ten hard questions across core Java concepts.',
    columns: 5,
    previewMs: 7000,
    flipBackMs: 820,
    conceptEntries: [
      { id: 'variable', hard: true },
      { id: 'boolean', hard: true },
      { id: 'array', hard: true },
      { id: 'condition', hard: true },
      { id: 'looping', hard: true },
      { id: 'method', hard: true },
      { id: 'class', hard: true },
      { id: 'inheritance', hard: true },
      { id: 'polymorphism', hard: true },
      { id: 'abstraction', hard: true },
    ],
  },
]);

// ── Helpers ──────────────────────────────────────────────────────────────────
const cloneQuestion = (question) => ({
  prompt: question.prompt,
  options: question.options.map((option) => ({ id: option.id, label: option.label })),
  correctOptionId: question.correctOptionId,
  hints: Array.isArray(question.hints) ? [...question.hints] : [],
  explanation: typeof question.explanation === 'string' ? question.explanation : '',
});

const QUESTION_VARIATION_PROMPTS = Object.freeze([
  (label, prompt) => prompt,
  (label) => `Which option best defines ${label}?`,
  (label) => `What does ${label} usually mean in programming?`,
  (label) => `Which statement is true about ${label}?`,
  (label) => `How is ${label} correctly understood in code?`,
  (label) => `Which answer matches the purpose of ${label}?`,
  (label) => `What should a beginner remember about ${label}?`,
  (label) => `Which choice correctly describes ${label}?`,
  (label) => `What is the main role of ${label}?`,
  (label) => `Which explanation fits ${label} best?`,
]);

const QUESTION_BANK_DISTRACTORS = Object.freeze([
  'A method that performs a reusable task',
  'A loop that repeats a block of code',
  'A class blueprint used to create objects',
  'A condition that chooses between branches',
  'An import statement that loads a package',
  'An operator that compares two values',
  'A text value written inside quotation marks',
  'A collection that stores multiple elements',
  'A return statement that exits a method',
  'A block of code enclosed in curly braces',
  'A value passed into a method call',
  'A true-or-false value used in logic',
]); 

const buildOptionVariations = (question, questionIndex, conceptLabel) => {
  const normalizedOptions = question.options.map((option, index) => ({
    id: option.id || String.fromCharCode(97 + index),
    label: option.label || String.fromCharCode(65 + index),
  }));
  const correctOption = normalizedOptions.find((option) => option.id === question.correctOptionId)
    || normalizedOptions[0]
    || { label: conceptLabel || 'the concept' };
  const correctChoiceVariations = Array.isArray(question.correctChoiceVariations)
    ? question.correctChoiceVariations
        .map((label) => String(label || '').trim())
        .filter(Boolean)
    : [];
  const correctLabel = correctChoiceVariations[questionIndex % correctChoiceVariations.length]
    || correctOption.label;
  const originalDistractors = normalizedOptions
    .filter((option) => option.id !== question.correctOptionId)
    .map((option) => option.label);
  const distractorPool = [...originalDistractors, ...QUESTION_BANK_DISTRACTORS]
    .filter((label) => label && label.toLowerCase() !== correctLabel.toLowerCase());
  const distractors = [];
  let cursor = questionIndex;

  while (distractors.length < 3 && distractorPool.length > 0) {
    const candidate = distractorPool[cursor % distractorPool.length];
    if (!distractors.some((label) => label.toLowerCase() === candidate.toLowerCase())) {
      distractors.push(candidate);
    }
    cursor += 1;
  }

  while (distractors.length < 3) {
    distractors.push(`Unrelated option ${distractors.length + 1}`);
  }

  const labelOffset = String(conceptLabel || '')
    .split('')
    .reduce((total, character) => total + character.charCodeAt(0), 0);
  const correctIndex = (questionIndex + labelOffset) % 4;
  const orderedLabels = [...distractors];
  orderedLabels.splice(correctIndex, 0, correctLabel);

  return {
    options: orderedLabels.slice(0, 4).map((label, index) => ({
      id: String.fromCharCode(97 + index),
      label,
    })),
    correctOptionId: String.fromCharCode(97 + correctIndex),
  };
};

const buildQuestionBank = (question, conceptLabel) => (
  QUESTION_VARIATION_PROMPTS.map((buildPrompt, index) => {
    const optionVariation = buildOptionVariations(question, index, conceptLabel);

    return {
      ...cloneQuestion(question),
      id: `${String(conceptLabel || 'question').toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'question'}-ai-${index + 1}`,
      prompt: buildPrompt(conceptLabel, question.prompt),
      ...optionVariation,
      source: 'AI_GENERATED_BANK',
    };
  })
);

const buildPairs = (conceptEntries, levelNumber) =>
  conceptEntries.map(({ id, hard }, index) => {
    const concept = conceptById[id];
    const question = hard ? concept.questionHard : concept.questionEasy;
    const questions = buildQuestionBank(question, concept.label);
    return {
      id: `${concept.id}-l${levelNumber}`,
      label: concept.label,
      accent: concept.accent,
      badge: String(index + 1).padStart(2, '0'),
      cardArt: concept.cardArt,
      spriteKey: concept.id,
      question: cloneQuestion(question),
      questions,
    };
  });

const buildLevel = (def) => ({
  id: `game-three-level-${String(def.levelNumber).padStart(2, '0')}`,
  seedVersion: Number(def.seedVersion || 0),
  gameType: 'GAME_THREE',
  levelNumber: def.levelNumber,
  title: def.title,
  subtitle: def.subtitle,
  objective: `Find ${def.conceptEntries.length} matching pairs of programming concepts before the flip attempts run out.`,
  viewport: {
    width: 1280,
    height: 720,
  },
  settings: {
    columns: def.columns,
    previewMs: def.previewMs,
    flipBackMs: def.flipBackMs,
  },
  pairs: buildPairs(def.conceptEntries, def.levelNumber),
});

// ── Exports ──────────────────────────────────────────────────────────────────
export const GAME_THREE_LEVEL_SEEDS = Object.freeze(
  LEVEL_DEFINITIONS.reduce((accumulator, def) => {
    accumulator[def.levelNumber] = buildLevel(def);
    return accumulator;
  }, {}),
);

export const GAME_THREE_LEVEL_BLUEPRINTS = Object.freeze(
  LEVEL_DEFINITIONS.map((def) => ({
    levelNumber: def.levelNumber,
    title: def.title,
    subtitle: def.subtitle,
    description: def.description,
    pairCount: def.conceptEntries.length,
    columns: def.columns,
    previewMs: def.previewMs,
    flipBackMs: def.flipBackMs,
  })),
);

export const GAME_THREE_LEVEL_TEMPLATES = Object.freeze(
  LEVEL_DEFINITIONS.reduce((accumulator, def) => {
    accumulator[def.levelNumber] = {
      title: def.title,
      description: def.description,
    };
    return accumulator;
  }, {}),
);

export const PROGRAMMING_CONCEPT_POOL = CONCEPT_POOL;

const levelCatalog = Object.freeze({
  PROGRAMMING_CONCEPT_POOL,
  GAME_THREE_LEVEL_BLUEPRINTS,
  GAME_THREE_LEVEL_SEEDS,
  GAME_THREE_LEVEL_TEMPLATES,
});

export default levelCatalog;
