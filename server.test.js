// Do not modify this file
const request = require("supertest");
// const { response } = require("./app");
const app = require("./app.solution.js");
const fs = require("fs");
const path = require("path");
const validID = 1;
const invalidID = "a";
const courses = JSON.parse(
	fs.readFileSync(path.join(__dirname, "database/courses.json"))
);
const existingUser = {
	username: "admin",
	password: "admin",
	id: 1,
	courses: courses[0],
};

afterAll(() => {
	fs.writeFileSync(
		path.join(__dirname, "database/users.json"),
		JSON.stringify([existingUser])
	);
});

describe("serving static files", () => {
	let pages = ["index", "login", "signup", "account"];
	let responses = [];
	beforeAll(async () => {
		for (let i = 0; i < pages.length; i++) {
			responses[i] = await request(app).get(`/${pages[i]}.html`);
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
	let queries = ["", "?code=SODV", "?num=1202", "?num=2", "?code=TECH&num=1"];
	let responses = [];
	beforeAll(async () => {
		for (let i = 0; i < queries.length; i++) {
			const q = queries[i];
			responses[i] = await request(app).get(`/courses${q}`);
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
			expect(responses[0].body.toEqual(courses));
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
				expect(responses[2].body).toEqual(
					courses.filter((course) => course.num === 1202)
				);
			});
			test("1 digit number should filter by first digit of course number", () => {
				expect(responses[3].body).toEqual(
					courses.filter((course) => course.num[0] === "2")
				);
			});
		});
		test("compound queries (ie. ?code=XXX&num=XXXX) should work", () => {
			expect(responses[4].body).toEqual(
				courses.filter((course) => course.code === "TECH" && course.num[0] === 1)
			);
		});
	});
});

describe("GET /account/:id", () => {
	beforeAll(() => {
		fs.writeFileSync(
			path.join(__dirname, "database/users.json"),
			JSON.stringify([existingUser])
		);
	});
	describe("if {id} is a user's ID", () => {
		let res;
		beforeAll(async () => {
			res = await request(app).get(`/account/${validID}`);
		});
		test("should respond with code 200", () => {
			expect(res.statusCode).toBe(200);
		});
		test("should respond with JSON data", () => {
			expect(res.headers["content-type"]).toEqual(expect.stringContaining("json"));
		});
		test("response object should contain a user object with 'username', 'userId', and 'courses' properties", () => {
			expect(Object.keys(res.body.user).includes("username")).toBe(true);
			expect(Object.keys(res.body.user).includes("userId")).toBe(true);
			expect(Object.keys(res.body.user).includes("courses")).toBe(true);
		});
		test("response object should contian a user object which should not contain a 'password' property", () => {
			expect(Object.keys(res.body.user).includes("password")).toBe(false);
		});
		test("response object should match the user's data", () => {
			expect(res.body.user.username).toBe(existingUser.username);
			expect(res.body.user.userId).toBe(existingUser.id);
			expect(res.body.user.courses).toEqual(existingUser.courses);
		});
	});
	describe("if {id} does not match a user", () => {
		let res;
		beforeAll(async () => {
			res = await request(app).get(`/account/${invalidID}`);
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
			JSON.stringify([existingUser])
		);
	});
	describe("if valid login info in req body", () => {
		let res;
		beforeAll(async () => {
			res = await request(app)
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
			badUsername = await request(app)
				.post("/users/login")
				.send({ username: "fake", password: "fake" });
			badPassword = await request(app)
				.post("/users/login")
				.send({ username: existingUser.username, password: "fake" });
		});

		test("should respond with JSON data", () => {});
		test("response object should contain 'error' property with appropriate message", () => {});
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
			JSON.stringify([existingUser])
		);
	});
	describe("if username in req body is available", () => {
		let res;
		beforeAll(async () => {
			res = await request(app)
				.post("/users/signup")
				.send({ username: "newUser", password: "newPassword" });
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
				res = await request(app)
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
});

describe("PATCH /account/:id/courses/add", () => {
	beforeAll(() => {
		fs.writeFileSync(
			path.join(__dirname, "database/users.json"),
			JSON.stringify([existingUser])
		);
	});

	describe("if course in req body is invalid", () => {
		let res;
		beforeAll(async () => {
			res = await request(app)
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
			res = await request(app)
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
			res = await request(app)
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
			res = await request(app)
				.patch(`/account/${existingUser.id}/courses/add`)
				.send({ course: courses[1] });
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
			expect(res.body.courses).toEqual(expect.arrayContaining([courses[1]]));
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
			JSON.stringify([existingUser])
		);
	});
	describe("if course in req body is invalid", () => {
		let res;
		beforeAll(async () => {
			res = await request(app)
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
			res = await request(app)
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
			res = await request(app)
				.patch(`/account/${existingUser.id}/courses/remove`)
				.send({ course: courses[1] });
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
				res = await request(app)
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
				expect(users.find((user) => user.id === existingUser.id)).toEqual(res.body);
			});
		});
	});
});
// describe("REST API Behaviour", () => {
// 	let sampleData;
// 	let knownID;
// 	let badID = "ihopethisisntanID";
// 	let newID;
// 	beforeAll(async () => {
// 		let res = await request(app).get("/api");
// 		sampleData = res.body[0];
// 		knownID = sampleData._id;
// 		delete sampleData["_id"];
// 	});

// 	describe("GET /api", () => {
// 		let response;
// 		beforeAll(async () => {
// 			response = await request(app).get("/api");
// 		});
// 		test("should respond with 200 status code", () => {
// 			expect(response.statusCode).toBe(200);
// 		});
// 		test("should respond with a JSON object", () => {
// 			expect(response.headers["content-type"]).toEqual(
// 				expect.stringContaining("json")
// 			);
// 		});
// 	});

// 	describe("GET /api/search?{KEY}={VALUE}", () => {
// 		describe("when search result exists in database", () => {
// 			let response;
// 			beforeAll(async () => {
// 				response = await request(app).get(`/api/search?_id=${knownID}`);
// 			});
// 			test("should respond with 200 status code", () => {
// 				expect(response.statusCode).toBe(200);
// 			});
// 			test("should respond with a JSON object", () => {
// 				expect(response.headers["content-type"]).toEqual(
// 					expect.stringContaining("json")
// 				);
// 			});
// 			test("results should contain the key and value from the query", () => {
// 				expect(response.body[0]._id).toBe(knownID);
// 			});
// 		});
// 		describe("when search result does not exist in database", () => {
// 			let response;
// 			beforeAll(async () => {
// 				response = await request(app).get(`/api/search?_id=${badID}`);
// 			});
// 			test("should respond with 400 status code", () => {
// 				expect(response.statusCode).toBe(400);
// 			});
// 			test("should respond with a JSON object", () => {
// 				expect(response.headers["content-type"]).toEqual(
// 					expect.stringContaining("json")
// 				);
// 			});
// 			test("response object should contain an error message", () => {
// 				expect(Object.keys(response.body)[0]).toEqual("error");
// 			});
// 		});
// 	});

// 	describe("POST /api", () => {
// 		describe("when request body is valid data for POST", () => {
// 			let response;

// 			beforeAll(async () => {
// 				response = await request(app).post("/api").send(sampleData);
// 				newID = response.body._id;
// 			});
// 			test("should respond with 201 status code", () => {
// 				expect(response.statusCode).toBe(201);
// 			});
// 			test("should respond with a JSON object", () => {
// 				expect(response.headers["content-type"]).toEqual(
// 					expect.stringContaining("json")
// 				);
// 			});
// 			test("response should match new record in database", async () => {
// 				let newRecord = await request(app).get(`/api/search?_id=${newID}`);
// 				expect(response.body).toEqual(newRecord.body[0]);
// 			});
// 		});
// 		describe("when request body is invalid data for POST", () => {
// 			let response;
// 			beforeAll(async () => {
// 				response = await request(app)
// 					.post("/api")
// 					.send({ dontusethiskey: "itisjustfakedata" });
// 			});
// 			test("should respond with 400 status code", () => {
// 				expect(response.statusCode).toBe(400);
// 			});
// 			test("should respond with a JSON object", () => {
// 				expect(response.headers["content-type"]).toEqual(
// 					expect.stringContaining("json")
// 				);
// 			});
// 			test("response object should contain an error message", () => {
// 				expect(Object.keys(response.body)[0]).toEqual("error");
// 			});
// 			test("should not add a new record with the invalid data", async () => {
// 				let newRecord = await request(app).get(
// 					`/api/search?dontusethiskey=itisjustfakedata`
// 				);
// 				expect(newRecord.statusCode).toBe(400);
// 				expect(Object.keys(newRecord.body)[0]).toBe("error");
// 			});
// 		});
// 	});

// 	describe("PUT /api/:id", () => {
// 		describe("when the id exists in the database", () => {
// 			describe("when request body is valid data for PUT", () => {
// 				let response;
// 				beforeAll(async () => {
// 					if (!newID) {
// 						newID = (await request(app).post("/api").send(sampleData)).body._id;
// 					}
// 					let emptyData = {};
// 					Object.keys(sampleData).forEach((key) => {
// 						emptyData[key] = null;
// 					});
// 					response = await request(app).put(`/api/${newID}`).send(emptyData);
// 				});
// 				test("should respond with 200 status code", () => {
// 					expect(response.statusCode).toBe(200);
// 				});
// 				test("should respond with a JSON object", () => {
// 					expect(response.headers["content-type"]).toEqual(
// 						expect.stringContaining("json")
// 					);
// 				});
// 				test("response should match new record in database", async () => {
// 					let newRecord = await request(app).get(`/api/search?_id=${newID}`);
// 					expect(response.body).toEqual(newRecord.body[0]);
// 				});
// 			});
// 			describe("when request body is invalid data for PUT", () => {
// 				let response;
// 				beforeAll(async () => {
// 					newID = (await request(app).post("/api").send(sampleData)).body._id;

// 					response = await request(app)
// 						.put(`/api/${newID}`)
// 						.send({ dontusethiskey: "itisjustfakedata" });
// 				});
// 				test("should respond with 400 status code", () => {
// 					expect(response.statusCode).toBe(400);
// 				});
// 				test("should respond with a JSON object", () => {
// 					expect(response.headers["content-type"]).toEqual(
// 						expect.stringContaining("json")
// 					);
// 				});
// 				test("original record shoud remain unchanged", async () => {
// 					let newRes = await request(app).get(`/api/search?_id=${newID}`);
// 					let newRecord = newRes.body[0];
// 					delete newRecord["_id"];
// 					expect(sampleData).toEqual(newRecord);
// 				});
// 			});
// 		});

// 		describe("when the id does not exist in the database", () => {
// 			describe("when request body is valid data for PUT", () => {
// 				let response;
// 				let randomID;
// 				beforeAll(async () => {
// 					randomID = Math.floor(Math.random() * 100000);
// 					response = await request(app)
// 						.put(`/api/${randomID}`)
// 						.send(sampleData);
// 				});
// 				test("should respond with 201 status code", () => {
// 					expect(response.statusCode).toBe(201);
// 				});
// 				test("should respond with a JSON object", () => {
// 					expect(response.headers["content-type"]).toEqual(
// 						expect.stringContaining("json")
// 					);
// 				});
// 				test("response should match new record in database", async () => {
// 					let newRecord = await request(app).get(`/api/search?_id=${randomID}`);
// 					expect(response.body).toEqual(newRecord.body[0]);
// 				});
// 			});
// 		});
// 	});

// 	describe("DELETE /api/:id", () => {
// 		describe("when the id exists in the database", () => {
// 			let response;
// 			beforeAll(async () => {
// 				if (!newID) {
// 					newID = (await request(app).post("/api").send(sampleData)).body._id;
// 				}
// 				response = await request(app).delete(`/api/${newID}`);
// 			});
// 			test("should respond with 204 status code", () => {
// 				expect(response.statusCode).toBe(204);
// 			});
// 			test("should remove matching record from database", async () => {
// 				let newRecord = await request(app).get(`/api/search?_id=${newID}`);
// 				expect(newRecord.statusCode).toBe(400);
// 				expect(Object.keys(newRecord.body)[0]).toBe("error");
// 			});
// 		});
// 		describe("when the id does not exist in the database", () => {
// 			let response;
// 			beforeAll(async () => {
// 				response = await request(app).delete(`/api/${badID}`);
// 			});
// 			test("should respond with 404 status code", () => {
// 				expect(response.statusCode).toBe(404);
// 			});
// 			test("should respond with a JSON object", () => {
// 				expect(response.headers["content-type"]).toEqual(
// 					expect.stringContaining("json")
// 				);
// 			});
// 			test("response object should contain an error message", () => {
// 				expect(Object.keys(response.body)[0]).toEqual("error");
// 			});
// 		});
// 	});
// });
