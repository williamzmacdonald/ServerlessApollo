// graphql.js

const { ApolloServer, gql } = require("apollo-server-lambda");
const { unmarshall, marshall } = require("@aws-sdk/util-dynamodb");
const {
    DynamoDBClient,
    ScanCommand,
    PutItemCommand,
    GetItemCommand,
    DeleteItemCommand,
} = require("@aws-sdk/client-dynamodb");

const {
    ApolloServerPluginLandingPageGraphQLPlayground,
} = require("apollo-server-core");

const client = new DynamoDBClient({ region: "us-east-1" });

// Construct a schema, using GraphQL schema language
const typeDefs = gql`
    type Character {
        id: String!
        name: String!
        attributes: Attributes!
    }

    type Attributes {
        strength: Int!
        dexterity: Int!
        constitution: Int!
        wisdom: Int!
        intelligence: Int!
        charisma: Int!
    }

    type Query {
        characters: [Character]
        character(id: String!): Character
    }

    type Mutation {
        addCharacter(
            name: String!
            strength: Int!
            dexterity: Int!
            constitution: Int!
            wisdom: Int!
            intelligence: Int!
            charisma: Int!
        ): Character
        updateCharacter(
            id: String!
            name: String!
            strength: Int!
            dexterity: Int!
            constitution: Int!
            wisdom: Int!
            intelligence: Int!
            charisma: Int!
        ): Character
        deleteCharacter(id: String!): [Character]
    }
`;

const getCharacters = async () => {
    const params = {
        TableName: "characters",
    };
    console.log("getting characters");

    try {
        const results = await client.send(new ScanCommand(params));
        const characters = [];
        results.Items.forEach((item) => {
            characters.push(unmarshall(item));
        });
        return characters;
    } catch (err) {
        console.error(err);
        return err;
    }
};

const getCharacter = async (payload) => {
    console.log("getting a character", payload.id);

    try {
        const result = await client.send(
            new GetItemCommand({
                TableName: "characters",
                Key: marshall({
                    id: payload.id,
                }),
            })
        );

        const character = unmarshall(result.Item);
        console.log("got character:", character);
        return character;
    } catch (err) {
        console.error(err);
        return err;
    }
};

const deleteCharacter = async (payload) => {
    console.log("deleting a character", payload.id);

    try {
        await client.send(
            new DeleteItemCommand({
                TableName: "characters",
                Key: marshall({
                    id: payload.id,
                }),
            })
        );

        console.log("deleted character");
        return getCharacters();
    } catch (err) {
        console.error(err);
        return err;
    }
};

const addCharacter = async (payload) => {
    const id = Math.floor(Math.random() * 100000000).toString();
    const params = {
        TableName: "characters",
        Item: marshall({
            id: id,
            name: payload.name,
            attributes: {
                strength: payload.strength,
                dexterity: payload.dexterity,
                constitution: payload.constitution,
                wisdom: payload.wisdom,
                intelligence: payload.intelligence,
                charisma: payload.charisma,
            },
        }),
    };
    console.log("adding character:", params);

    try {
        await client.send(new PutItemCommand(params));

        const result = await client.send(
            new GetItemCommand({
                TableName: "characters",
                Key: marshall({
                    id: id,
                }),
            })
        );

        const character = unmarshall(result.Item);
        console.log("added character:", character);
        return character;
    } catch (err) {
        console.error(err);
        return err;
    }
};

const updateCharacter = async (payload) => {
    const params = {
        TableName: "characters",
        Item: marshall({
            id: payload.id,
            name: payload.name,
            attributes: {
                strength: payload.strength,
                dexterity: payload.dexterity,
                constitution: payload.constitution,
                wisdom: payload.wisdom,
                intelligence: payload.intelligence,
                charisma: payload.charisma,
            },
        }),
    };
    console.log("updating character:", params);

    try {
        await client.send(new PutItemCommand(params));

        const result = await client.send(
            new GetItemCommand({
                TableName: "characters",
                Key: marshall({
                    id: payload.id,
                }),
            })
        );

        const character = unmarshall(result.Item);
        console.log("updated character:", character);
        return character;
    } catch (err) {
        console.error(err);
        return err;
    }
};

// Provide resolver functions for your schema fields
const resolvers = {
    Query: {
        characters() {
            return getCharacters();
        },
        character(_, payload) {
            return getCharacter(payload);
        },
    },
    Mutation: {
        addCharacter(_, payload) {
            return addCharacter(payload);
        },
        deleteCharacter(_, payload) {
            return deleteCharacter(payload);
        },
        updateCharacter(_, payload) {
            return updateCharacter(payload);
        },
    },
};

const server = new ApolloServer({
    typeDefs,
    resolvers,

    // By default, the GraphQL Playground interface and GraphQL introspection
    // is disabled in "production" (i.e. when `process.env.NODE_ENV` is `production`).
    //
    // If you'd like to have GraphQL Playground and introspection enabled in production,
    // install the Playground plugin and set the `introspection` option explicitly to `true`.
    introspection: true,
    plugins: [ApolloServerPluginLandingPageGraphQLPlayground()],
});

exports.graphqlHandler = server.createHandler({
    cors: {
        origin: "*",
        credentials: true,
    },
});
