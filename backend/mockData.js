// Mock users
const users = [
    { id: 'user1', username: 'alice', password: 'password1' },
    { id: 'user2', username: 'bob', password: 'password2' },
    { id: 'user3', username: 'charlie', password: 'password3' }
];

// Mock note as an object with id and content
let note = {
    id: 'note1',
    content: 'This is a shared collaborative note.'
};

module.exports = {
    users,
    note
}; 