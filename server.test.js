//Do not modify this file
const request = require("supertest");
const { response } = require("./app");
const app = require("./app");

describe("serving static files", () => {
	let response;
	beforeAll(async () => {
		response = await request(app).get("/");
	});
	test("should respond with 200 status code", () => {
		expect(response.statusCode).toBe(200);
	});

	test("should with an html document", () => {
		expect(response.headers["content-type"]).toEqual(
			expect.stringContaining("html")
		);
	});
});

describe("REST API Behaviour", () => {
	let sampleData;
	let knownID;
	let badID = "ihopethisisntanID";
	let newID;
	beforeAll(async () => {
		let res = await request(app).get("/api");
		sampleData = res.body[0];
		knownID = sampleData._id;
		delete sampleData["_id"];
	});

	describe("GET /api", () => {
		let response;
		beforeAll(async () => {
			response = await request(app).get("/api");
		});
		test("should respond with 200 status code", () => {
			expect(response.statusCode).toBe(200);
		});
		test("should respond with a JSON object", () => {
			expect(response.headers["content-type"]).toEqual(
				expect.stringContaining("json")
			);
		});
	});

	describe("GET /api/search?{KEY}={VALUE}", () => {
		describe("when search result exists in database", () => {
			let response;
			beforeAll(async () => {
				response = await request(app).get(`/api/search?_id=${knownID}`);
			});
			test("should respond with 200 status code", () => {
				expect(response.statusCode).toBe(200);
			});
			test("should respond with a JSON object", () => {
				expect(response.headers["content-type"]).toEqual(
					expect.stringContaining("json")
				);
			});
			test("results should contain the key and value from the query", () => {
				expect(response.body[0]._id).toBe(knownID);
			});
		});
		describe("when search result does not exist in database", () => {
			let response;
			beforeAll(async () => {
				response = await request(app).get(`/api/search?_id=${badID}`);
			});
			test("should respond with 400 status code", () => {
				expect(response.statusCode).toBe(400);
			});
			test("should respond with a JSON object", () => {
				expect(response.headers["content-type"]).toEqual(
					expect.stringContaining("json")
				);
			});
			test("response object should contain an error message", () => {
				expect(Object.keys(response.body)[0]).toEqual("error");
			});
		});
	});

	describe("POST /api", () => {
		describe("when request body is valid data for POST", () => {
			let response;

			beforeAll(async () => {
				response = await request(app).post("/api").send(sampleData);
				newID = response.body._id;
			});
			test("should respond with 201 status code", () => {
				expect(response.statusCode).toBe(201);
			});
			test("should respond with a JSON object", () => {
				expect(response.headers["content-type"]).toEqual(
					expect.stringContaining("json")
				);
			});
			test("response should match new record in database", async () => {
				let newRecord = await request(app).get(`/api/search?_id=${newID}`);
				expect(response.body).toEqual(newRecord.body[0]);
			});
		});
		describe("when request body is invalid data for POST", () => {
			let response;
			beforeAll(async () => {
				response = await request(app)
					.post("/api")
					.send({ dontusethiskey: "itisjustfakedata" });
			});
			test("should respond with 400 status code", () => {
				expect(response.statusCode).toBe(400);
			});
			test("should respond with a JSON object", () => {
				expect(response.headers["content-type"]).toEqual(
					expect.stringContaining("json")
				);
			});
			test("response object should contain an error message", () => {
				expect(Object.keys(response.body)[0]).toEqual("error");
			});
			test("should not add a new record with the invalid data", async () => {
				let newRecord = await request(app).get(
					`/api/search?dontusethiskey=itisjustfakedata`
				);
				expect(newRecord.statusCode).toBe(400);
				expect(Object.keys(newRecord.body)[0]).toBe("error");
			});
		});
	});

	describe("PUT /api/:id", () => {
		describe("when the id exists in the database", () => {
			describe("when request body is valid data for PUT", () => {
				let response;
				beforeAll(async () => {
					if (!newID) {
						newID = (await request(app).post("/api").send(sampleData)).body._id;
					}
					let emptyData = {};
					Object.keys(sampleData).forEach((key) => {
						emptyData[key] = null;
					});
					response = await request(app).put(`/api/${newID}`).send(emptyData);
				});
				test("should respond with 200 status code", () => {
					expect(response.statusCode).toBe(200);
				});
				test("should respond with a JSON object", () => {
					expect(response.headers["content-type"]).toEqual(
						expect.stringContaining("json")
					);
				});
				test("response should match new record in database", async () => {
					let newRecord = await request(app).get(`/api/search?_id=${newID}`);
					expect(response.body).toEqual(newRecord.body[0]);
				});
			});
			describe("when request body is invalid data for PUT", () => {
				let response;
				beforeAll(async () => {
					newID = (await request(app).post("/api").send(sampleData)).body._id;

					response = await request(app)
						.put(`/api/${newID}`)
						.send({ dontusethiskey: "itisjustfakedata" });
				});
				test("should respond with 400 status code", () => {
					expect(response.statusCode).toBe(400);
				});
				test("should respond with a JSON object", () => {
					expect(response.headers["content-type"]).toEqual(
						expect.stringContaining("json")
					);
				});
				test("original record shoud remain unchanged", async () => {
					let newRes = await request(app).get(`/api/search?_id=${newID}`);
					let newRecord = newRes.body[0];
					delete newRecord["_id"];
					expect(sampleData).toEqual(newRecord);
				});
			});
		});

		describe("when the id does not exist in the database", () => {
			describe("when request body is valid data for PUT", () => {
				let response;
				let randomID;
				beforeAll(async () => {
					randomID = Math.floor(Math.random() * 100000);
					response = await request(app)
						.put(`/api/${randomID}`)
						.send(sampleData);
				});
				test("should respond with 201 status code", () => {
					expect(response.statusCode).toBe(201);
				});
				test("should respond with a JSON object", () => {
					expect(response.headers["content-type"]).toEqual(
						expect.stringContaining("json")
					);
				});
				test("response should match new record in database", async () => {
					let newRecord = await request(app).get(`/api/search?_id=${randomID}`);
					expect(response.body).toEqual(newRecord.body[0]);
				});
			});
		});
	});

	describe("DELETE /api/:id", () => {
		describe("when the id exists in the database", () => {
			let response;
			beforeAll(async () => {
				if (!newID) {
					newID = (await request(app).post("/api").send(sampleData)).body._id;
				}
				response = await request(app).delete(`/api/${newID}`);
			});
			test("should respond with 204 status code", () => {
				expect(response.statusCode).toBe(204);
			});
			test("should remove matching record from database", async () => {
				let newRecord = await request(app).get(`/api/search?_id=${newID}`);
				expect(newRecord.statusCode).toBe(400);
				expect(Object.keys(newRecord.body)[0]).toBe("error");
			});
		});
		describe("when the id does not exist in the database", () => {
			let response;
			beforeAll(async () => {
				response = await request(app).delete(`/api/${badID}`);
			});
			test("should respond with 404 status code", () => {
				expect(response.statusCode).toBe(404);
			});
			test("should respond with a JSON object", () => {
				expect(response.headers["content-type"]).toEqual(
					expect.stringContaining("json")
				);
			});
			test("response object should contain an error message", () => {
				expect(Object.keys(response.body)[0]).toEqual("error");
			});
		});
	});
});
