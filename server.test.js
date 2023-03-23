// Do not modify this file
const supertest = require("supertest");
const app = require("./app");
// const app = require("./app.solution.js");
const request = supertest(app);
const fs = require("fs");
const path = require("path");

const invalidID = "a";
const courses = JSON.parse(
	fs.readFileSync(path.join(__dirname, "database/courses.json"))
);
const existingUser = {
	username: "admin",
	password: "admin",
	id: 1,
	courses: [courses[0]],
};

afterAll(() => {
	fs.writeFileSync(
		path.join(__dirname, "database/users.json"),
		JSON.stringify([existingUser], null, 2)
	);
});

describe("serving static files", () => {
	let pages = ["index", "login", "signup", "account"];
	let responses = [];
	beforeAll(async () => {
		for (let i = 0; i < pages.length; i++) {
			responses[i] = await request.get(`/${pages[i]}.html`);
		}
	});
	test("should respond with 200 status code", () => {
		console.log(responses.length);
		responses.forEach((response) => {
			expect(response.statusCode).toBe(200);
		});
	});

	test("should with an html document", () => {
		responses.forEach((response) => {
			expect(response.headers["content-type"]).toEqual(expect.stringContaining("html"));
		});
	});
});

describe("GET /courses", () => {
	let queries = ["", "?code=SODV", "?num=1201", "?num=2", "?code=TECH&num=1"];
	let responses = [];
	beforeAll(async () => {
		for (let i = 0; i < queries.length; i++) {
			const q = queries[i];
			responses[i] = await request.get(`/courses${q}`);
		}
	});
	describe("should respond", () => {
		test("should respond with 200 status code", () => {
			responses.forEach((response) => {
				expect(response.statusCode).toBe(200);
			});
		});
		test("should respond with JSON data", () => {
			expect(responses[0].headers["content-type"]).toEqual(
				expect.stringContaining("json")
			);
		});
		test("should respond with the contents of courses.json", () => {
			expect(responses[0].body).toEqual(courses);
		});
	});
	describe("should accept query parameters", () => {
		test("?code= should filter by course code", () => {
			expect(responses[1].body).toEqual(
				courses.filter((course) => course.code === "SODV")
			);
		});
		describe("?num= should filter by course number", () => {
			test("4 digit number should filter by full course number", () => {
				expect(responses[2].body).toEqual(courses.filter((course) => course.num == 1201));
			});
			test("1 digit number should filter by first digit of course number", () => {
				expect(responses[3].body).toEqual(
					courses.filter((course) => course.num[0] === "2")
				);
			});
		});
		test("compound queries (ie. ?code=XXX&num=XXXX) should work", () => {
			expect(responses[4].body).toEqual(
				courses.filter((course) => course.code === "TECH" && course.num[0] == 1)
			);
		});
	});
});

describe("GET /account/:id", () => {
	beforeAll(() => {
		fs.writeFileSync(
			path.join(__dirname, "database/users.json"),
			JSON.stringify([existingUser], null, 2)
		);
	});
	describe("if {id} is a user's ID", () => {
		let res;
		beforeAll(async () => {
			res = await request.get(`/account/${existingUser.id}`);
		});
		test("should respond with code 200", () => {
			expect(res.statusCode).toBe(200);
		});
		test("should respond with JSON data", () => {
			expect(res.headers["content-type"]).toEqual(expect.stringContaining("json"));
		});
		test("response object should contain a user object with 'username', 'id', and 'courses' properties", () => {
			expect(Object.keys(res.body.user).includes("username")).toBe(true);
			expect(Object.keys(res.body.user).includes("id")).toBe(true);
			expect(Object.keys(res.body.user).includes("courses")).toBe(true);
		});
		test("response object should contian a user object which should not contain a 'password' property", () => {
			expect(Object.keys(res.body.user).includes("password")).toBe(false);
		});
		test("response object should match the user's data", () => {
			expect(res.body.user.username).toBe(existingUser.username);
			expect(res.body.user.id).toBe(existingUser.id);
			expect(res.body.user.courses).toEqual(existingUser.courses);
		});
	});
	describe("if {id} does not match a user", () => {
		let res;
		beforeAll(async () => {
			res = await request.get(`/account/${invalidID}`);
		});
		test("should respond with code 404", () => {
			expect(res.statusCode).toBe(404);
		});
		test("should respond with JSON data", () => {
			expect(res.headers["content-type"]).toEqual(expect.stringContaining("json"));
		});
		test("response object should contain 'error' property with appropriate message", () => {
			expect(res.body.error).toBeDefined();
		});
	});
});

describe("POST /users/login", () => {
	beforeAll(() => {
		fs.writeFileSync(
			path.join(__dirname, "database/users.json"),
			JSON.stringify([existingUser], null, 2)
		);
	});
	describe("if valid login info in req body", () => {
		let res;
		beforeAll(async () => {
			res = await request
				.post("/users/login")
				.send({ username: existingUser.username, password: existingUser.password });
		});
		test("should respond with code 200", () => {
			expect(res.statusCode).toBe(200);
		});
		test("should respond with JSON data", () => {
			expect(res.headers["content-type"]).toEqual(expect.stringContaining("json"));
		});
		test("response object should contain 'userId' property", () => {
			expect(Object.keys(res.body).includes("userId")).toBe(true);
		});
	});
	describe("if invalid login info in req body", () => {
		let badUsername;
		let badPassword;
		beforeAll(async () => {
			badUsername = await request
				.post("/users/login")
				.send({ username: "fake", password: "fake" });
			badPassword = await request
				.post("/users/login")
				.send({ username: existingUser.username, password: "fake" });
		});

		test("should respond with JSON data", () => {
			expect(badUsername.headers["content-type"]).toEqual(
				expect.stringContaining("json")
			);
			expect(badPassword.headers["content-type"]).toEqual(
				expect.stringContaining("json")
			);
		});
		test("response object should contain 'error' property with appropriate message", () => {
			expect(badUsername.body.error).toBeDefined();
			expect(badPassword.body.error).toBeDefined();
		});
		describe("if username is invalid", () => {
			test("should respond with code 404", () => {
				expect(badUsername.statusCode).toBe(404);
			});
		});
		describe("if password is invalid", () => {
			test("should respond with code 401", () => {
				expect(badPassword.statusCode).toBe(401);
			});
		});
	});
});

describe("POST /users/signup", () => {
	beforeAll(() => {
		fs.writeFileSync(
			path.join(__dirname, "database/users.json"),
			JSON.stringify([existingUser], null, 2)
		);
	});
	describe("if username in req body is available", () => {
		let res;
		beforeAll(async () => {
			res = await request
				.post("/users/signup")
				.send({ username: "newUser", password: "newPassword" });
		});
		test("should respond with code 201", () => {
			expect(res.statusCode).toBe(201);
		});
		test("should respond with JSON data", () => {
			expect(res.headers["content-type"]).toEqual(expect.stringContaining("json"));
		});
		test("response object should contain userId property", () => {
			expect(res.body.userId).toBeDefined();
		});
		test("users file should contain new user", () => {
			const users = JSON.parse(
				fs.readFileSync(path.join(__dirname, "database/users.json"))
			);
			expect(users.find((user) => user.username === "newUser")).toBeDefined();
		});
	});
	describe("if username in req body is already taken", () => {
		let res;
		beforeAll(async () => {
			res = await request
				.post("/users/signup")
				.send({ username: existingUser.username, password: "newPassword" });
		});
		test("should respond with code 409", () => {
			expect(res.statusCode).toBe(409);
		});
		test("should respond with JSON data", () => {
			expect(res.headers["content-type"]).toEqual(expect.stringContaining("json"));
		});
		test("response object should contain 'error' property with appropriate message", () => {
			expect(res.body.error).toBeDefined();
		});
		test("user record should remain unchanged", () => {
			const users = JSON.parse(
				fs.readFileSync(path.join(__dirname, "database/users.json"))
			);
			expect(users.find((user) => user.username === existingUser.username)).toEqual(
				existingUser
			);
		});
	});
});

describe("PATCH /account/:id/courses/add", () => {
	beforeAll(() => {
		fs.writeFileSync(
			path.join(__dirname, "database/users.json"),
			JSON.stringify([existingUser], null, 2)
		);
	});

	describe("if course in req body is invalid", () => {
		let res;
		beforeAll(async () => {
			res = await request
				.patch(`/account/${existingUser.id}/courses/add`)
				.send({ course: "fake" });
		});
		test("should respond with code 400", () => {
			expect(res.statusCode).toBe(400);
		});
		test("should respond with JSON data", () => {
			expect(res.headers["content-type"]).toEqual(expect.stringContaining("json"));
		});
		test("response object should contain 'error' property with appropriate message", () => {
			expect(res.body.error).toBeDefined();
		});
		test("user record should remain unchanged", () => {
			const users = JSON.parse(
				fs.readFileSync(path.join(__dirname, "database/users.json"))
			);
			expect(users.find((user) => user.id === existingUser.id)).toEqual(existingUser);
		});
	});
	describe("if {id} does not match a user", () => {
		let res;
		beforeAll(async () => {
			res = await request
				.patch(`/account/${existingUser.id + 1}/courses/add`)
				.send(existingUser.courses[0]);
		});
		test("should respond with code 401", () => {
			expect(res.statusCode).toBe(401);
		});
		test("should respond with JSON data", () => {
			expect(res.headers["content-type"]).toEqual(expect.stringContaining("json"));
		});
		test("response object should contain 'error' property with appropriate message", () => {
			expect(res.body.error).toBeDefined();
		});
		test("user record should remain unchanged", () => {
			const users = JSON.parse(
				fs.readFileSync(path.join(__dirname, "database/users.json"))
			);
			expect(users.find((user) => user.id === existingUser.id)).toEqual(existingUser);
		});
	});

	describe("if course is already in the user's courses", () => {
		let res;
		beforeAll(async () => {
			res = await request
				.patch(`/account/${existingUser.id}/courses/add`)
				.send(existingUser.courses[0]);
		});

		test("should respond with code 409", () => {
			expect(res.statusCode).toBe(409);
		});
		test("should respond with JSON data", () => {
			expect(res.headers["content-type"]).toEqual(expect.stringContaining("json"));
		});
		test("response object should contain 'error' property with appropriate message", () => {
			expect(res.body.error).toBeDefined();
		});
		test("user record should remain unchanged", () => {
			const users = JSON.parse(
				fs.readFileSync(path.join(__dirname, "database/users.json"))
			);
			expect(users.find((user) => user.id === existingUser.id)).toEqual(existingUser);
		});
	});
	describe("otherwise", () => {
		let res;
		beforeAll(async () => {
			res = await request
				.patch(`/account/${existingUser.id}/courses/add`)
				.send(courses[1]);
		});
		test("should respond with code 201", () => {
			expect(res.statusCode).toBe(201);
		});
		test("should respond with JSON data", () => {
			expect(res.headers["content-type"]).toEqual(expect.stringContaining("json"));
		});
		test("response object should contain 'courses' property with the user's updated course list", () => {
			expect(res.body.courses).toBeDefined();
		});
		test("courses should contain the added course", () => {
			expect(res.body.courses).toEqual([...existingUser.courses, courses[1]]);
		});
		test("user record should be updated", () => {
			const users = JSON.parse(
				fs.readFileSync(path.join(__dirname, "database/users.json"))
			);
			expect(users.find((user) => user.id === existingUser.id)).toEqual({
				...existingUser,
				courses: [...existingUser.courses, courses[1]],
			});
		});
	});
});

describe("PATCH /account/:id/courses/remove", () => {
	beforeAll(() => {
		fs.writeFileSync(
			path.join(__dirname, "database/users.json"),
			JSON.stringify([existingUser], null, 2)
		);
	});
	describe("if course in req body is invalid", () => {
		let res;
		beforeAll(async () => {
			res = await request
				.patch(`/account/${existingUser.id}/courses/remove`)
				.send({ course: "fake" });
		});
		test("should respond with code 400", () => {
			expect(res.statusCode).toBe(400);
		});
		test("should respond with JSON data", () => {
			expect(res.headers["content-type"]).toEqual(expect.stringContaining("json"));
		});
		test("response object should contain 'error' property with appropriate message", () => {
			expect(res.body.error).toBeDefined();
		});
	});
	describe("if {id} does not match a user", () => {
		let res;
		beforeAll(async () => {
			res = await request
				.patch(`/account/${existingUser.id + 1}/courses/remove`)
				.send(existingUser.courses[0]);
		});
		test("should respond with code 401", () => {
			expect(res.statusCode).toBe(401);
		});
		test("should respond with JSON data", () => {
			expect(res.headers["content-type"]).toEqual(expect.stringContaining("json"));
		});
		test("response object should contain 'error' property with appropriate message", () => {
			expect(res.body.error).toBeDefined();
		});
	});

	describe("if course is not in the user's courses", () => {
		let res;
		beforeAll(async () => {
			res = await request
				.patch(`/account/${existingUser.id}/courses/remove`)
				.send(courses[1]);
		});
		test("should respond with code 409", () => {
			expect(res.statusCode).toBe(409);
		});
		test("should respond with JSON data", () => {
			expect(res.headers["content-type"]).toEqual(expect.stringContaining("json"));
		});
		test("response object should contain 'error' property with appropriate message", () => {
			expect(res.body.error).toBeDefined();
		});
	});
	describe("otherwise", () => {
		let res;
		beforeAll(async () => {
			res = await request
				.patch(`/account/${existingUser.id}/courses/remove`)
				.send(existingUser.courses[0]);
		});
		test("should respond with code 200", () => {
			expect(res.statusCode).toBe(200);
		});
		test("should respond with JSON data", () => {
			expect(res.headers["content-type"]).toEqual(expect.stringContaining("json"));
		});
		test("response object should contain 'courses' property with the user's updated course list", () => {
			expect(res.body.courses).toBeDefined();
		});
		test("courses should not include the removed course", () => {
			expect(res.body.courses).not.toEqual(
				expect.arrayContaining([existingUser.courses[0]])
			);
		});
		test("user record should be updated", () => {
			const users = JSON.parse(
				fs.readFileSync(path.join(__dirname, "database/users.json"))
			);
			expect(users.find((user) => user.id == existingUser.id).courses).toEqual(
				res.body.courses
			);
		});
	});
});
