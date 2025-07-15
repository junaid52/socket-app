// Mock users
const users = [
    { id: 'user1', username: 'alice', password: 'password1' },
    { id: 'user2', username: 'bob', password: 'password2' },
    { id: 'user3', username: 'charlie', password: 'password3' }
];

// Mock notes as an array of note objects with owner and permissions
let notes = [
    {
        id: 'note1',
        owner: 'user1', // alice
        permitted: ['user1'], // Only Alice can access by default
        content: "Alice's private note.",
        public: false // Private note
    },
    {
        id: 'note2',
        owner: 'user2', // bob
        permitted: ['user2'], // Only Bob can access by default
        content: "Bob's public note.",
        public: true // Public note
    },
    {
        id: 'note3',
        owner: 'user3', // charlie
        permitted: ['user3'], // Only Charlie can access by default
        content: "Charlie's private note.",
        public: false // Private note
    }
];

module.exports = {
    users,
    notes
}; 