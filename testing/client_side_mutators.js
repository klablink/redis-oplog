/* eslint-env mocha */

import { assert } from 'chai'
import { Collections, config } from './boot'
import helperGenerator from './lib/helpers'

const Collection = Collections.Standard

describe('Client-side Mutators', function() {
  const {
    subscribe,
    fetchAsync,
    waitForHandleToBeReady,
  } = helperGenerator(config.Standard.suffix)

  it('Should detect an insert/update and removal from client side', function(done) {
    const handle = subscribe({
      client_side_mutators: true,
    })

    waitForHandleToBeReady(handle)
      .then(async function() {
        const cursor = Collection.find({ client_side_mutators: true })

        let testDocId
        let inChanged = false
        let inAdded = false
        let inRemoved = false
        let initialized = false
        const observer = cursor.observeChanges({
          added(docId, doc) {
            if (inAdded || !initialized) {
              return
            }
            inAdded = true

            testDocId = docId
            assert.equal(doc.number, 5)

            setTimeout(async () => {
              const result = await fetchAsync({ _id: docId })
              assert.isArray(result)
              assert.lengthOf(result, 1)
              assert.equal(result[0].number, 5)

              Collection.updateAsync({ _id: docId }, {
                $set: { number: 10 },
              })
            }, 100)
          },
          changed(docId, doc) {
            if (inChanged) {
              return
            }

            inChanged = true
            assert.equal(docId, testDocId)
            assert.equal(doc.number, 10)

            setTimeout(async () => {
              const result = await fetchAsync({ _id: docId })
              assert.lengthOf(result, 1)
              assert.equal(result[0].number, 10)

              Collection.removeAsync({ _id: docId })
            }, 100)
          },
          removed(docId) {
            if (inRemoved) {
              return
            }
            inRemoved = true
            assert.equal(docId, testDocId)
            observer.stop()
            done()
          },
        })
        initialized = true;

        await Collection.insertAsync({
          client_side_mutators: true,
          number: 5,
        }).stubPromise
      })
      .catch(done)
  })
})
