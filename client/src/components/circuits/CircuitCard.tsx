import { FC } from 'react';
import { CircuitListItem } from '@/types/circuit';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import clsx from 'clsx';
import stringToHslColor from '@/utils/stringToHslColor';
import { Users } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CircuitCardProps extends React.HTMLAttributes<HTMLDivElement> {
  circuit: CircuitListItem;
  onSubscribe: () => void;
  onUnsubscribe: () => void;
  isSubscribing?: boolean;
  isUnsubscribing?: boolean;
  user?: any;
}

const CircuitCard: FC<CircuitCardProps> = ({ circuit, onSubscribe, onUnsubscribe, isSubscribing, isUnsubscribing, user, ...rest }) => {
  return (
    <div
      className="flex flex-col rounded-2xl bg-white shadow hover:shadow-lg hover:-translate-y-1 transition focus-within:ring-2 ring-primary-500 border border-neutral-100 overflow-hidden"
      tabIndex={0}
      role="listitem"
      {...rest}
    >
      {/* Banner strip */}
      <div
        className="h-8 w-full"
        style={{ backgroundColor: stringToHslColor(circuit.name, 0.18, 0.92) }}
        aria-hidden="true"
      />
      <div className="flex-1 flex flex-col p-4">
        <div className="mb-2">
          <a href={`/circuits/${circuit.id}`} className="block">
            <h2 className="text-lg font-semibold truncate mb-1 text-neutral-800">{circuit.name}</h2>
          </a>
          {circuit.description ? (
            <p className="text-sm text-neutral-600 line-clamp-2 min-h-[2.5em]">{circuit.description}</p>
          ) : null}
        </div>
        <div className="flex items-center gap-2 mt-auto mb-3">
          {/* TODO: Use creator avatar if available in API */}
          <Avatar className="w-7 h-7">
            <AvatarFallback>{circuit.creatorName?.[0] || '?'}</AvatarFallback>
          </Avatar>
          <span className="text-xs text-neutral-500 font-medium truncate max-w-[80px]">@{circuit.creatorName || `user${circuit.creatorId}`}</span>
          <span className="text-xs text-neutral-400 ml-2 flex items-center"><Users className="w-4 h-4 mr-1" />{circuit.subscriberCount}</span>
        </div>
        {user && (
          circuit.isSubscribed ? (
            <Button
              variant="outline"
              className="w-full rounded-full py-1.5 text-sm font-semibold border-primary-500 text-primary-500 hover:bg-primary-500 hover:text-white transition"
              onClick={onUnsubscribe}
              disabled={isUnsubscribing}
              aria-label="Unsubscribe from circuit"
            >
              {isUnsubscribing ? 'Unsubscribing...' : 'Subscribed'}
            </Button>
          ) : (
            <Button
              className="w-full rounded-full py-1.5 text-sm font-semibold border-primary-500 text-primary-500 hover:bg-primary-500 hover:text-white transition"
              onClick={onSubscribe}
              disabled={isSubscribing}
              aria-label="Subscribe to circuit"
              variant="outline"
            >
              {isSubscribing ? 'Subscribing...' : 'Subscribe'}
            </Button>
          )
        )}
      </div>
    </div>
  );
};

export default CircuitCard; 