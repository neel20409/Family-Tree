// src/App.jsx
import TreeNode from "../components/TreeNode";
import familyTree from "../data/familyData";

function App() {
  return (
    <div className="min-h-screen w-full p-4">
      <div className="w-full h-full">
        <TreeNode />
      </div>
    </div>
  );
}

export default App;
