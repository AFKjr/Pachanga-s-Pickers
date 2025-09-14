import { useParams } from 'react-router-dom';

const GameThread = () => {
  const { gameId } = useParams();

  return (
    <div className="max-w-4xl mx-auto">
      <div className="card">
        <h1 className="text-2xl font-bold mb-4">Game Thread</h1>
        <p className="text-gray-400 mb-4">Discussion for Game ID: {gameId}</p>
        <p className="text-gray-500">This feature is coming soon...</p>
      </div>
    </div>
  );
};

export default GameThread;